import Mine from "./mine.js";
import { ExpansionJob, MiningJob } from "./job.js";

export default class Depot {

  constructor(base, pos, mineralFields) {
    this.pos = pos;
    this.distance = Math.sqrt((base.pos.x - pos.x) * (base.pos.x - pos.x) + (base.pos.y - pos.y) * (base.pos.y - pos.y));

    this.isBuilding = false;
    this.isActive = false;
    this.isProducing = false;
    this.isBoosted = false;
    this.hasSetRallyPoint = false;

    this.tag = undefined;

    this.mines = [];
    const line = getLineOfMineralFields(this, mineralFields.map(field => ({ tag: field.tag, pos: { x: field.x, y: field.y } })));
    for (const field of line) {
      this.mines.push(new Mine(field, this, line));
    }
    for (let i = 0; i < this.mines.length; i++) this.mines[i].index = i;
    this.workerLimit = calculateWorkerLimit(this);
  }

  sync(units) {
    let unit;

    if (this.tag) {
      unit = units.get(this.tag);

      if (!unit) {
        return (this.isActive = false);
      }
    } else {
      if (typeof(this.isBuilding) === "boolean") {
        for (const [tag, unit] of units) {
          if ((this.pos.x === unit.pos.x) && (this.pos.y === unit.pos.y)) {
            this.isBuilding = tag;
            break;
          }
        }
      }

      if (typeof(this.isBuilding) === "string") {
        const buildingUnit = units.get(this.isBuilding);

        if (buildingUnit.buildProgress >= 1) {
          this.tag = this.isBuilding;
          this.isBuilding = false;
          unit = buildingUnit;
        }
      }

      if (!unit) {
        return true;
      }
    }

    this.isActive = true;
    this.isProducing = !!unit.orders.length;
    this.isBoosted = !!unit.buffIds.length;

    let minesAreLess = false;

    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i];

      if (!mine.sync(units)) {
        this.mines.splice(i, 1);
        minesAreLess = true;
      }
    }
    for (let i = 0; i < this.mines.length; i++) this.mines[i].index = i;

    if (minesAreLess) {
      for (const mine of this.mines) {
        mine.position(this, getLineOfMineralFields(this, this.mines));
      }
    }

    this.workerLimit = calculateWorkerLimit(this);

    return !!this.mines.length;
  }

  build(worker) {
    worker.startJob(null, ExpansionJob, this);
    this.isBuilding = true;
  }

  hire(time, worker) {
    // Limit selection to the mines close to the last worked on mine, if any
    let minMineIndex = 0;
    let maxMineIndex = this.mines.length - 1;
    if (worker.target instanceof Mine) {
      minMineIndex = Math.max(worker.target.index - 3, minMineIndex);
      maxMineIndex = Math.min(worker.target.index + 3, maxMineIndex);
    }

    // Select mine
    let bestMine;
    let bestBooking;
    for (let index = minMineIndex; index <= maxMineIndex; index++) {
      const mine = this.mines[index];
      const booking = mine.draftBooking(time, worker);

      if (!bestMine || (booking.waitDuration < bestBooking.waitDuration) ||
          ((booking.waitDuration === bestBooking.waitDuration) && (booking.checkInTime < bestBooking.checkInTime))) {
        bestMine = mine;
        bestBooking = booking;
      }
    }

    // Hire worker
    bestMine.makeReservation(worker, bestBooking);
    worker.startJob(this, MiningJob, bestMine);
  }

  async produce(client) {
    if (this.isActive && !this.isProducing) {
      await client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [this.tag], abilityId: 1006, queueCommand: false } } }]});

      if (!this.hasSetRallyPoint) {
        const mine = this.mines[Math.floor(this.mines.length / 2)];
        await client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [this.tag], abilityId: 3690, targetWorldSpacePos: mine.storePoint, queueCommand: false } } }]});
        this.hasSetRallyPoint = true;
      }

      if (!this.isBoosted) {
        await client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [this.tag], abilityId: 3755, targetUnitTag: this.tag, queueCommand: true } } }]});
      }

      return true;
    }
  }

}

function calculateWorkerLimit(depot) {
  return depot.tag ? depot.mines.length * 2 + 2 : 0;
}

function getLineOfMineralFields(depot, fields) {
  const line = [];

  for (const field of fields) {
    let isFieldAddedToLine = false;

    for (let i = 0; i < line.length; i++) {
      if (calculateSide(line[i].pos, depot.pos, field.pos) < 0) {
        line.splice(i, 0, field);
        isFieldAddedToLine = true;
        break;
      }
    }

    if (!isFieldAddedToLine) {
      line.push(field);
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
