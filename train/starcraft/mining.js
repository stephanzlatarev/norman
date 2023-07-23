
const DEPOT_TYPES = { 59: "nexus" };
const RADIUS_WORKER = 0.375;
const RADIUS_MINERAL = 1.125 / 2;
const RADIUS_DEPOT = 2.75;
const DRILL_TIME = 46;

const Action = {
  ApproachMine: "ApproachMine",
  PushToMine: "PushToMine",
  Drill: "Drill",
  Pack: "Pack",
  ApproachDepot: "ApproachDepot",
  PushToDepot: "PushToDepot",
};

let depot;

async function mine(client, time, units) {
  if (!depot) {
    for (const tag in units) {
      if (DEPOT_TYPES[units[tag].unitType]) {
        depot = new Depot(units[tag]);

        for (const mineTag in units) {
          if (units[mineTag].unitType === 341) {
            depot.assignMine(time, units[mineTag]);
          }
        }

        for (const workerTag in units) {
          if (units[workerTag].unitType === 84) {
            depot.assignWorker(units[workerTag]);
          }
        }

        break;
      }
    }
  }

  await depot.mine(client, time, units);
}

class Depot {

  constructor(unit) {
    this.tag = unit.tag;
    this.pos = { x: unit.pos.x, y: unit.pos.y };
    this.workers = {};
    this.mines = {};
  }

  assignWorker(unit) {
    this.workers[unit.tag] = {
      tag: unit.tag,
      pos: { x: unit.pos.x, y: unit.pos.y },
      job: null,
    };
  }

  assignMine(time, unit) {
    this.mines[unit.tag] = {
      tag: unit.tag, unitPos: unit.pos, pos: unit.pos, content: 0,
      lastCheckOutTime: time, freeCheckInTime: time,
      time: { idle: 0, blocked: 0, used: 0 },
    };
  }

  calculateMineLocations(mine) {
    const distanceX = Math.abs(this.pos.x - mine.unitPos.x);

    // Check if adjacent mines are blocking this mine from one side
    let offsetX = 0;
    if (distanceX > 2) {
      offsetX = (this.pos.x - mine.unitPos.x > 0) ? 0.5 : -0.5;
    } else {
      const offsetY = Math.sign(this.pos.y - mine.unitPos.y);
      for (const otherMineTag in this.mines) {
        if (otherMineTag === mine.tag) continue;

        const otherMine = this.mines[otherMineTag];
        if (otherMine.unitPos.y === mine.unitPos.y + offsetY) {
          if (otherMine.unitPos.x === mine.unitPos.x + 1) {
            offsetX = -0.5;
            break;
          } else if (otherMine.unitPos.x === mine.unitPos.x - 1) {
            offsetX = 0.5;
            break;
          }
        }
      }
    }

    mine.pos = { x: mine.unitPos.x + offsetX, y: mine.unitPos.y };
    mine.harvestLocation = calculatePathEnd(this.pos, mine.pos, RADIUS_WORKER + RADIUS_MINERAL);
    mine.storeLocation = calculatePathEnd(mine.pos, this.pos, RADIUS_WORKER + RADIUS_DEPOT);
    mine.harvestToStoreDistance = calculateDistance(mine.storeLocation, mine.harvestLocation);
    mine.harvestToStoreWalkTime = estimateWalkTime(mine.storeLocation, mine.harvestLocation);
    mine.boost = mine.harvestToStoreDistance / 2;
  }

  async mine(client, time, units) {
    this.syncUnits(units);

    await this.commandWorkers(client, time, units);
  }

  checkOutMine(time, job) {
    const mine = this.mines[job.mineTag];

    // Calculate how much time this mine was idle or blocked
    const jobReservationTime = Math.max(job.estimatedArrivalTime, mine.lastCheckOutTime);
    const jobDrillStartTime = time - DRILL_TIME;
    mine.time.used += DRILL_TIME;
    if (jobReservationTime < jobDrillStartTime) {
      mine.time.idle += (jobReservationTime - mine.lastCheckOutTime);
      mine.time.blocked += jobDrillStartTime - jobReservationTime;
    } else {
      mine.time.idle += (jobDrillStartTime - mine.lastCheckOutTime);
    }

    // Announce next free check-in time
    if (mine.content > 5) {
      const arrivals = [];
      for (const workerTag in this.workers) {
        const job = this.workers[workerTag].job;
        if (job && (job.mineTag === mine.tag)) {
          arrivals.push(job.estimatedArrivalTime);
        }
      }
      arrivals.sort();
      let freeCheckInTime = time;
      for (const arrivalTime of arrivals) {
        freeCheckInTime = Math.max(freeCheckInTime, arrivalTime + DRILL_TIME);
      }
      mine.freeCheckInTime = freeCheckInTime;
    } else {
      mine.freeCheckInTime = Infinity;
    }

    mine.lastCheckOutTime = time;
  }

  syncUnits(units) {
    for (const workerTag in this.workers) {
      const unit = units[workerTag];

      if (unit) {
        const worker = this.workers[workerTag];
        worker.pos.x = unit.pos.x;
        worker.pos.y = unit.pos.y;
        worker.order = unit.orders.length ? unit.orders[0] : { abilityId: 0 };
      } else {
        delete this.workers[workerTag];
      }
    }

    let mineCount = 0;
    for (const mineTag in this.mines) {
      const unit = units[mineTag];

      if (unit) {
        const mine = this.mines[mineTag];
        mine.content = unit.mineralContents;
        mineCount++;
      } else {
        delete this.mines[mineTag];
      }
    }

    if (this.mineCount !== mineCount) {
      for (const mineTag in this.mines) {
        this.calculateMineLocations(this.mines[mineTag]);
      }

      this.mineCount = mineCount;
    }
  }

  async commandWorkers(client, time) {
    for (const workerTag in this.workers) {
      const worker = this.workers[workerTag];

      if (worker.job) {
        const job = worker.job;
        const order = worker.order;

        if ((worker.action === Action.ApproachMine) && (calculateDistance(worker.pos, job.harvestLocation) < job.boost)) {
          worker.action = Action.PushToMine;
          await client.action({ actions: [
            { actionRaw: { unitCommand: { unitTags: [workerTag], abilityId: 1, targetWorldSpacePos: job.harvestLocation, queueCommand: false } } },
            { actionRaw: { unitCommand: { unitTags: [workerTag], abilityId: 1, targetUnitTag: job.mineTag, queueCommand: true } } },
          ]});
        } else if ((worker.action === Action.PushToMine) && (order.abilityId === 298)) {
          worker.action = Action.Drill;
        } else if ((worker.action === Action.Drill) && (order.abilityId === 298) && (order.targetUnitTag !== job.mineTag)) {
          // The mine is busy and worker attempts to go to a free mine. Force it to the mine of this job.
          await client.action({ actions: [
            { actionRaw: { unitCommand: { unitTags: [workerTag], abilityId: 298, targetUnitTag: job.mineTag, queueCommand: false } } }
          ]});
        } else if ((worker.action === Action.Drill) && (order.abilityId === 299)) {
          worker.action = Action.Pack;
          this.checkOutMine(time, worker.job);
        } else if ((worker.action === Action.Pack) && order.targetUnitTag) {
          worker.action = Action.ApproachDepot;
          await client.action({ actions: [
            { actionRaw: { unitCommand: { unitTags: [workerTag], abilityId: 1, targetUnitTag: job.depotTag, queueCommand: false } } },
          ]});
        } else if ((worker.action === Action.ApproachDepot) && (calculateDistance(worker.pos, job.storeLocation) < job.boost)) {
          worker.action = Action.PushToDepot;
          await client.action({ actions: [
            { actionRaw: { unitCommand: { unitTags: [workerTag], abilityId: 1, targetWorldSpacePos: job.storeLocation, queueCommand: false } } },
            { actionRaw: { unitCommand: { unitTags: [workerTag], abilityId: 1, targetUnitTag: job.depotTag, queueCommand: true } } },
            { actionRaw: { unitCommand: { unitTags: [workerTag], abilityId: 1, targetUnitTag: job.mineTag, queueCommand: true } } },
          ]});
        } else if ((worker.action === Action.PushToDepot) && (order.abilityId === 298)) {
          worker.job = null;
        }
      }

      if (!worker.job) {
        worker.job = this.createJob(time, worker);
        worker.action = Action.ApproachMine;
        await client.action({ actions: [
          { actionRaw: { unitCommand: { unitTags: [workerTag], abilityId: 1, targetUnitTag: worker.job.mineTag, queueCommand: false } } },
        ]});
      }
    }
  }

  createJob(time, worker) {
    let job;
    let jobMine;
    let jobWorkStart;
    let jobWaitTime;

    // Select mine
    for (const mineTag in this.mines) {
      const mine = this.mines[mineTag];
      const routeDuration = calculateRouteDuration(worker, this, mine);
      const estimatedArrivalTime = time + routeDuration;
      const thisWorkStart = Math.max(mine.freeCheckInTime, estimatedArrivalTime);
      const thisWaitTime = Math.max(mine.freeCheckInTime - estimatedArrivalTime, 0);

      if (!job || (thisWaitTime < jobWaitTime) || ((thisWaitTime === jobWaitTime) && (thisWorkStart < jobWorkStart))) {
        job = {
          start: time,
          depotTag: this.tag, workerTag: worker.tag, mineTag: mineTag,
          storeLocation: mine.storeLocation, harvestLocation: mine.harvestLocation,
          duration: routeDuration,
          boost: mine.boost,
          estimatedArrivalTime: estimatedArrivalTime,
        };
        jobMine = mine;
        jobWorkStart = thisWorkStart;
        jobWaitTime = thisWaitTime;
      }
    }

    // Make reservation at the selected mine
    jobMine.freeCheckInTime = jobWorkStart + DRILL_TIME;

    worker.job = job;
    return job;
  }

}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

function estimateWalkTime(a, b) {
  const distance = calculateDistance(a, b);
  return (distance >= 1.45) ? 17 + Math.ceil((distance - 1.45) / 0.1756) : 17;
}

function calculatePathEnd(from, to, radius) {
  const distance = calculateDistance(from, to);

  return {
    x: to.x + radius * (from.x - to.x) / distance,
    y: to.y + radius * (from.y - to.y) / distance,
  };
}

function calculateRouteDuration(worker, depot, mine) {
  let duration = 0;

  if (worker.job) {
    if (worker.job.mineTag === mine.tag) {
      duration = mine.harvestToStoreWalkTime;
    } else {
      // TODO: make this the sum of two fields (the time estimation won't change)
      const jobMine = depot.mines[worker.job.mineTag];
      duration = estimateWalkTime(jobMine.storeLocation, mine.storeLocation) + mine.harvestToStoreWalkTime;
    }
  } else {
    duration = estimateWalkTime(worker.pos, mine.harvestLocation);
  }

  return duration;
}

////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

import { spawn } from "child_process";
import starcraft from "@node-sc2/proto";

const GAME_CONFIG = {
  path: "C:\\games\\StarCraft II",
  "version": "Base90136",
  realtime: false,
  "localMap": { "mapPath": "mining.SC2Map" },
  playerSetup: [
    { type: 1, race: 3 },
    { type: 2, race: 4, difficulty: 1 }
  ]
};

const client = starcraft();

async function startGame() {
  console.log("Starting StarCraft II game...");

  spawn("..\\Versions\\" + GAME_CONFIG.version + "\\SC2.exe", [
    "-displaymode", "0", "-windowx", "0", "-windowy", "0",
    "-windowwidth", "1920", "-windowwidth", "1440",
    "-listen", "127.0.0.1", "-port", "5000"
  ], {
    cwd: GAME_CONFIG.path + "\\Support"
  });

  for (let i = 0; i < 12; i++) {
    try {
      await client.connect({ host: "localhost", port: 5000 });
      break;
    } catch (_) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  await client.createGame(GAME_CONFIG);

  await client.joinGame({
    race: GAME_CONFIG.playerSetup[0].race,
    options: { raw: true },
  });
}

async function go() {
  await startGame();

  while (true) {
    await client.step({ count: 1 });

    const observation = (await client.observation()).observation;
    const time = observation.gameLoop;
    const units = {};
    for (const unit of observation.rawData.units) units[unit.tag] = unit;

    traceHarvest(observation, time);

    await mine(client, time, units);

    // Slow game down to close to real time
    await new Promise(r => setTimeout(r, 40));
  }
}

let lastTraceSecond;
let lastTraceMineralContent;

function traceHarvest(observation, time) {
  const second = Math.floor(time / 22.4);
  const mines = observation.rawData.units.filter(unit => (unit.unitType === 341));
  const workers = observation.rawData.units.filter(unit => (unit.unitType === 84));

  if ((second !== lastTraceSecond) && (second % 60 === 0)) {
    const mineralContent = measureMineralContent(mines);
    const mineralHarvest = lastTraceMineralContent ? lastTraceMineralContent - mineralContent : 0;

    console.log(
      "Mines:", mines.length, "Workers:", workers.length,
      "Harvest:", mineralHarvest.toFixed(2), "/", (mines.length * 5 * 30.15).toFixed(2), "minerals per minute",
    );

    lastTraceSecond = second;
    lastTraceMineralContent = mineralContent;
  }
}

function measureMineralContent(mines) {
  let content = 0;

  for (const mine of mines) {
    content += mine.mineralContents;
  }

  return content;
}

go();
