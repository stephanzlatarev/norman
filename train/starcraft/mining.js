
const DEPOTS = { 59: "nexus" };
const WORKERS = { 84: "probe" };

const LIMIT_WORKERS = 72;

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
  BuildExpansion: "BuildExpansion",
};

const depots = {};
const workers = {};

async function mine(client, observation, map, units) {
  const time = observation.gameLoop;

  for (const tag in units) {
    const unit = units[tag];

    if ((unit.buildProgress >= 1) && !depots[tag] && DEPOTS[unit.unitType]) {
      const cluster = map.clusters.find(cluster => (cluster.nexus && (cluster.nexus.x === unit.pos.x) && (cluster.nexus.y === unit.pos.y)));
      const pos = cluster.nexus;
      delete pos.builderTag;
      pos.tag = tag;

      const mines = cluster.resources.filter(resource => (resource.type === "mineral")).map(resource => findMineralField(resource, units)).filter(one => !!one);
      const depot = new Depot(pos, unit, mines);
      depots[tag] = depot;

      if (pos.d === undefined) {
        for (const nexus of map.nexuses) {
          nexus.d = calculateDistance(nexus, pos);
        }
      }
    }
  }

  for (const tag in units) {
    const unit = units[tag];
    if (!workers[unit.tag] && WORKERS[unit.unitType]) {
      transferWorker(unit);
      workers[unit.tag] = true;
    }
  }

  const expansionJob = expand(client, observation, map, units);
  for (const tag in depots) {
    const depot = depots[tag];

    if (units[tag]) {
      await depot.mine(client, time, units, expansionJob);
      await depot.produce(client, observation, units[tag]);
    } else {
      for (const workerTag in depot.workers) {
        transferWorker(depot.workers[workerTag], depot);
      }
      delete depots[tag].pos.tag;
      delete depots[tag];
    }
  }
}

function findMineralField(resource, units) {
  if (units[resource.tag]) return units[resource.tag];

  for (const tag in units) {
    const unit = units[tag];

    if ((unit.pos.x === resource.x) && (unit.pos.y === resource.y)) {
      return unit;
    }
  }
}

function expand(client, observation, map, units) {
  const hasMinerals = observation.playerCommon.minerals >= 400;
  if (!hasMinerals) return;

  const location = findExpansionLocation(map, units);
  if (location) {
    return async function(worker) {
      if (units[location.builderTag]) return false;
      await client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [worker.tag], abilityId: 880, targetWorldSpacePos: location, queueCommand: false } } }]});
      location.builderTag = worker.tag;
      observation.playerCommon.minerals -= 400;
      return true;
    }
  }
}

function findExpansionLocation(map, units) {
  const locations = map.nexuses.filter(nexus => (!nexus.tag && (!nexus.builderTag || !units[nexus.builderTag]))).sort((a, b) => (a.d - b.d));
  return locations.length ? locations[0] : null;
}

function transferWorker(worker, fromDepot) {
  let bestDistance = Infinity;
  let bestDepot;

  for (const tag in depots) {
    const depot = depots[tag];

    if (depot.workerCount < depot.workerLimit) {
      const thisDistance = calculateDistance(depot.pos, worker.pos);

      if (thisDistance < bestDistance) {
        bestDepot = depot;
        bestDistance = thisDistance;
      }
    }
  }

  if (fromDepot) {
    if (bestDepot !== fromDepot) {
      fromDepot.unassignWorker(worker);
      bestDepot.assignWorker(worker);
    }
  } else if (bestDepot) {
    bestDepot.assignWorker(worker);
  }
}

class Depot {

  constructor(pos, unit, mines) {
    this.tag = unit.tag;
    this.pos = pos;
    this.workers = {};
    this.mines = {};
    this.workerCount = 0;
    this.workerLimit = Infinity;
    this.monitorData = { minute: -1, minerals: -1, ready: false };

    for (const mine of mines) this.assignMine(0, mine);
  }

  assignWorker(unit) {
    this.workers[unit.tag] = {
      tag: unit.tag,
      pos: { x: unit.pos.x, y: unit.pos.y },
      job: null,
    };
    this.workerCount = Object.keys(this.workers).length;
  }

  unassignWorker(unit) {
    delete this.workers[unit.tag];
    this.workerCount--;
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

  async mine(client, time, units, backlogJob) {
    this.syncUnits(units);

    if (this.mineCount && this.workerCount) {
      await this.commandWorkers(client, time, backlogJob);

      this.monitor(time);
    }
  }

  async produce(client, observation, unit) {
    const hasReachedLimit = observation.playerCommon.foodWorkers >= LIMIT_WORKERS;
    const hasMinerals = observation.playerCommon.minerals >= 50;
    const hasFood = observation.playerCommon.foodCap - observation.playerCommon.foodUsed >= 1;
    const isBusy = !!unit.orders.length;

    if (!hasReachedLimit && hasMinerals && hasFood && !isBusy) {
      await client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [unit.tag], abilityId: 1006, queueCommand: false } } }]});

      if (!this.hasSetRallyPoint) {
        const mine = this.mineLine[Math.floor(this.mineLine.length / 2)];
        await client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [unit.tag], abilityId: 3690, targetWorldSpacePos: mine.storeLocation, queueCommand: false } } }]});
        this.hasSetRallyPoint = true;
      }

      if (!unit.buffIds.length) {
        await client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [unit.tag], abilityId: 3755, targetUnitTag: unit.tag, queueCommand: true } } }]});
      }

      observation.playerCommon.minerals -= 50;
      observation.playerCommon.foodUsed += 1;
    }
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
    let workerCount = 0;
    for (const workerTag in this.workers) {
      const unit = units[workerTag];

      if (unit) {
        const worker = this.workers[workerTag];
        worker.pos.x = unit.pos.x;
        worker.pos.y = unit.pos.y;
        worker.order = unit.orders.length ? unit.orders[0] : { abilityId: 0 };
        workerCount++;
      } else {
        delete this.workers[workerTag];
      }
    }
    this.workerCount = workerCount;

    let mineCount = 0;
    for (const mineTag in this.mines) {
      const unit = units[mineTag];
      const mine = this.mines[mineTag];

      if (unit) {
        mine.content = unit.mineralContents;
        mineCount++;
      } else {
        delete this.mines[mineTag];

        let newTag;
        for (const tag in units) {
          const unit = units[tag];

          if ((mine.unitPos.x === unit.pos.x) && (mine.unitPos.y === unit.pos.y)) {
            newTag = tag;
            break;
          }
        }

        if (newTag) {
          mine.content = units[newTag].mineralContents;
          mineCount++;

          mine.tag = newTag;
          this.mines[newTag] = mine;
        } else {
          for (const workerTag in this.workers) {
            const worker = this.workers[workerTag];

            if (worker.job && (worker.job.mineTag === mineTag)) {
              worker.job = null;
            }
          }
        }
      }
    }

    if (this.mineCount !== mineCount) {
      for (const mineTag in this.mines) {
        this.calculateMineLocations(this.mines[mineTag]);
      }

      this.mineCount = mineCount;
      this.mineLine = getLineOfMines(this, Object.values(this.mines));
      this.workerLimit = mineCount * 2 + 2;
    }
  }

  async commandWorkers(client, time, backlogJob) {
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
        } else if ((worker.action === Action.BuildExpansion) && !order.abilityId) {
          worker.job = null;
        }
      }

      if (!worker.job) {
        if ((this.workerCount > this.workerLimit) || (worker.action === Action.BuildExpansion)) {
          worker.action = null;
          transferWorker(worker, this);
        } else if (backlogJob && (await backlogJob(worker))) {
          worker.job = {};
          worker.action = Action.BuildExpansion;
        } else {
          worker.job = this.createJob(time, worker);
          worker.action = Action.ApproachMine;
          await client.action({ actions: [
            { actionRaw: { unitCommand: { unitTags: [workerTag], abilityId: 1, targetUnitTag: worker.job.mineTag, queueCommand: false } } },
          ]});
        }
      }
    }
  }

  createJob(time, worker) {
    let job;
    let jobMine;
    let jobWorkStart;
    let jobWaitTime;

    // Limit selection to the nearby mines
    let minMineIndex = 0;
    let maxMineIndex = this.mineCount;
    if (worker.lastMineTag) {
      const lastMine = this.mines[worker.lastMineTag];
      if (lastMine) {
        minMineIndex = Math.max(lastMine.index - 3, minMineIndex);
        maxMineIndex = Math.min(lastMine.index + 3, maxMineIndex);
      }
    }

    // Select mine
    for (const mineTag in this.mines) {
      const mine = this.mines[mineTag];
      if ((mine.index < minMineIndex) || (mine.index > maxMineIndex)) continue;

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
    worker.lastMineTag = jobMine.tag;
    return job;
  }

  monitor(time) {
    const minute = Math.floor(time / 22.4 / 60);
    if (minute === this.monitorData.minute) return;

    let minerals = 0;
    let mineralMines = 0;
    let timeUsed = 0;
    let timeBlocked = 0;
    let timeIdle = 0;
    for (const mineTag in this.mines) {
      const mine = this.mines[mineTag];

      minerals += mine.content;
      mineralMines++;

      timeUsed += mine.time.used;
      timeBlocked += mine.time.blocked;
      timeIdle += mine.time.idle;
    }

    if (this.monitorData.ready && mineralMines) {
      const harvestMinerals = this.monitorData.minerals - minerals;
      const utilization = timeUsed * 100 / (timeUsed + timeBlocked + timeIdle);

      console.log(
        "Harvest at depot", this.tag, "with", mineralMines, "mineral fields", "and", Object.keys(this.workers).length, "workers", "is",
        Math.floor(harvestMinerals), "minerals at", utilization.toFixed(2) + "% utilization",
      );
    }

    this.monitorData.ready = true;
    this.monitorData.minute = minute;
    this.monitorData.minerals = minerals;
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

function calculateSide(a, b, c) {
  return Math.sign((b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y));
}

function getLineOfMines(depot, mines) {
  const line = [];

  for (const mine of mines) {
    let isMineAddedToLine = false;

    for (let i = 0; i < line.length; i++) {
      if (calculateSide(line[i].pos, depot.pos, mine.pos) < 0) {
        line.splice(i, 0, mine);
        isMineAddedToLine = true;
        break;
      }
    }

    if (!isMineAddedToLine) {
      line.push(mine);
    }
  }

  for (let i = 0; i < line.length; i++) {
    line[i].index = i;
  }

  return line;
}

////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

import { spawn } from "child_process";
import starcraft from "@node-sc2/proto";
import Map from "../../body/starcraft/map/map.js";

const GAME_CONFIG = {
  path: "C:\\games\\StarCraft II",
  "version": "Base90136",
  realtime: false,
  "localMap": { "mapPath": "MoondanceAIE.SC2Map" },
  playerSetup: [
    { type: 1, race: 3 },
    { type: 2, race: 4, difficulty: 1 }
  ]
};
const SLOW_DOWN = 0;

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

  let map;

  while (true) {
    await client.step({ count: 1 });

    const observation = (await client.observation()).observation;

    if (!map) {
      map = new Map(await client.gameInfo(), observation);
    }

    const units = {};
    for (const unit of observation.rawData.units) units[unit.tag] = unit;

    await mine(client, observation, map, units);

    if (SLOW_DOWN) await new Promise(r => setTimeout(r, SLOW_DOWN));
  }
}

go();
