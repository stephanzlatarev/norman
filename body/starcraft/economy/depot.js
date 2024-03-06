import Mine from "./mine.js";
import { ExpansionJob, MiningJob } from "./job.js";

const COOLDOWN_BUILD = Math.floor(22.4 * 20);
const CHANGE_LANE_LIMIT = 2;

export default class Depot {

  constructor(base, pos, sources) {
    this.pos = pos;
    this.distance = Math.sqrt((base.pos.x - pos.x) * (base.pos.x - pos.x) + (base.pos.y - pos.y) * (base.pos.y - pos.y));

    if (!this.distance) {
      this.tag = base.tag;
    }

    this.isBuilding = false;
    this.isActive = false;
    this.isProducing = false;
    this.isBoosted = false;
    this.hasSetRallyPoint = false;
    this.cooldown = 0;

    this.harvesters = 0;
    this.mines = [];
    const line = getLineOfSources(this, sources);
    for (const source of line) {
      this.mines.push(new Mine(source, this, line));
    }
    for (let i = 0; i < this.mines.length; i++) this.mines[i].index = i;
    this.workerLimit = 0;
    this.workerLimitMineral = 0;
    this.workerLimitVespene = 0;
  }

  sync(units, resources) {
    let unit;

    if (this.tag) {
      unit = units.get(this.tag);

      if (unit) {
        this.isActive = true;
      } else {
        this.tag = undefined;
        this.isActive = false;
        this.workerLimit = 0;
        this.workerLimitMineral = 0;
        this.workerLimitVespene = 0;
        this.cooldown = COOLDOWN_BUILD;
        return true;
      }
    } else if (this.isBuilding) {
      if (typeof(this.isBuilding) === "boolean") {
        if (this.builder.isActive) {
          for (const [tag, unit] of units) {
            if ((this.pos.x === unit.pos.x) && (this.pos.y === unit.pos.y)) {
              this.isBuilding = tag;
              this.isActive = false;
              delete this.builder;
              break;
            }
          }
        } else {
          this.isBuilding = false;
          this.isActive = false;
          this.cooldown = COOLDOWN_BUILD;
          delete this.builder;
        }
      }

      if (typeof(this.isBuilding) === "string") {
        const buildingUnit = units.get(this.isBuilding);

        if (!buildingUnit) {
          this.isActive = false;
          this.isBuilding = false;
          this.cooldown = COOLDOWN_BUILD;
        } else if (buildingUnit.buildProgress >= 1) {
          this.tag = this.isBuilding;
          this.isActive = true;
          this.isBuilding = false;
          this.hasSetRallyPoint = false;
          unit = buildingUnit;
        }
      }

      if (!unit) {
        return true;
      }
    } else {
      this.isActive = false;
      this.cooldown = Math.max(this.cooldown - 1, 0);
      return true;
    }

    this.isProducing = !!unit.orders.length;
    this.isBoosted = !!unit.buffIds.length;
    this.harvesters = unit.assignedHarvesters;

    let workerLimit = 0;
    let workerLimitMineral = 0;
    let workerLimitVespene = 0;
    let workerBonusMineral = 0;
    let workerBonusVespene = 0;
    let minesAreLess = false;

    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i];

      if (mine.sync(units, resources)) {
        workerLimit += mine.workerLimit;

        if (mine.workerLimit) {
          if (mine.isMineral) {
            workerLimitMineral += mine.workerLimit;
            workerBonusMineral = 2;
          } else {
            workerLimitVespene += mine.workerLimit;
            workerBonusVespene = 1;
          }
        }
      } else {
        this.mines.splice(i, 1);
        minesAreLess = true;
      }
    }
    for (let i = 0; i < this.mines.length; i++) this.mines[i].index = i;

    if (minesAreLess) {
      for (const mine of this.mines) {
        mine.position(this, getLineOfSources(this, this.mines));
      }
    }

    this.workerLimit = workerLimit + workerBonusMineral + workerBonusVespene;
    this.workerLimitMineral = workerLimitMineral + workerBonusMineral;
    this.workerLimitVespene = workerLimitVespene + workerBonusVespene;

    return !!this.mines.length;
  }

  build(worker) {
    worker.startJob(null, ExpansionJob, this);
    this.isBuilding = true;
    this.builder = worker;
  }

  cancelBuild() {
    this.isBuilding = false;
    this.cooldown = COOLDOWN_BUILD;
    delete this.builder;
  }

  hire(time, worker) {
    // Limit selection to the mines close to the last worked on mine, if any
    let minMineIndex = 0;
    let maxMineIndex = this.mines.length - 1;
    if (worker.target instanceof Mine) {
      minMineIndex = Math.max(worker.target.index - CHANGE_LANE_LIMIT, minMineIndex);
      maxMineIndex = Math.min(worker.target.index + CHANGE_LANE_LIMIT, maxMineIndex);
    }

    // Select mine
    let bestMine;
    let bestBooking;
    for (let index = minMineIndex; index <= maxMineIndex; index++) {
      const mine = this.mines[index];
      if (!mine.isActive) continue;

      const booking = mine.draftBooking(time, worker);

      if (!bestMine || (booking.waitDuration < bestBooking.waitDuration) ||
          ((booking.waitDuration === bestBooking.waitDuration) && (booking.checkInTime < bestBooking.checkInTime))) {
        bestMine = mine;
        bestBooking = booking;
      }
    }

    // Hire worker
    if (bestMine) {
      bestMine.makeReservation(worker, bestBooking);
      worker.startJob(this, MiningJob, bestMine, bestBooking);
    }
  }

  async produce(client) {
    if (this.isActive && !this.isProducing) {
      const response = await client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [this.tag], abilityId: 1006, queueCommand: false } } }]});

      if (response.result[0] !== 1) {
        return false;
      }

      if (!this.hasSetRallyPoint) {
        const rallyPoint = this.getRallyMine().storePoint;
        await client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [this.tag], abilityId: 3690, targetWorldSpacePos: rallyPoint, queueCommand: false } } }]});
        this.hasSetRallyPoint = true;
      }

      if (!this.isBoosted) {
        await client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [this.tag], abilityId: 3755, targetUnitTag: this.tag, queueCommand: true } } }]});
      }

      return true;
    }
  }

  getRallyMine() {
    return this.mines[Math.floor(this.mines.length / 2)];
  }

}

function getLineOfSources(depot, sources) {
  const line = [];

  for (const source of sources) {
    let isSourceAddedToLine = false;

    for (let i = 0; i < line.length; i++) {
      if (calculateSide(line[i], depot.pos, source) < 0) {
        line.splice(i, 0, source);
        isSourceAddedToLine = true;
        break;
      }
    }

    if (!isSourceAddedToLine) {
      line.push(source);
    }
  }

  for (let i = 0; i < line.length; i++) {
    line[i].index = i;
  }

  return line;
}

function calculateSide(a, b, c) {
  return Math.sign((b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y));
}