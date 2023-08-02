import Monitor from "./monitor.js";
import { AssimilatorJob } from "./job.js";

const OFFSET_MINERAL = 0.95;
const OFFSET_VESPENE = 1.95;
const OFFSET_DEPOT = 3.0;
const OFFSET_BOOST = 0.2;

const MINERAL_DRILL_PACK = 5;
const MINERAL_DRILL_TIME = 46;
const VESPENE_DRILL_PACK = 4;
const VESPENE_DRILL_TIME = 31;

export default class Mine {

  constructor(source, depot, line) {
    this.source = source;
    this.tag = source.tag;

    this.isMineral = (source.type === "mineral");
    this.isActive = this.isMineral;
    this.isBuilding = false;

    this.content = Infinity;

    this.bookings = new Map();
    this.drillPack = this.isMineral ? MINERAL_DRILL_PACK : VESPENE_DRILL_PACK;
    this.drillTime = this.isMineral ? MINERAL_DRILL_TIME : VESPENE_DRILL_TIME;
    this.lastCheckOutTime = 0;
    this.freeCheckInTime = 0;

    this.position(depot, line);
  }

  position(depot, line) {
    this.depot = depot;
    this.pos = getMineCenter(this.source, depot, line);
    this.storePoint = calculatePathEnd(this.pos, depot.pos, OFFSET_DEPOT);
  }

  build(worker) {
    worker.startJob(worker.depot, AssimilatorJob, this);
    this.builder = worker;
  }

  sync(units, resources) {
    let unit;

    if (this.isMineral) {
      unit = resources.get(this.tag);

      if (!unit) {
        // Check if the mineral field changed tag
        unit = findUnitAtPoint(resources, this.source);

        if (unit) {
          this.tag = unit.tag;
        }
      }

      if (unit && (unit.displayType === 1)) {
        this.content = unit.mineralContents;
      } else if (unit) {
        this.content = Infinity;
      } else {
        this.content = 0;
        this.isActive = false;
      }

      return (unit && this.content);      
    } else {
      unit = units.get(this.tag);

      if (this.isActive && !unit) {
        return (this.isActive = false);
      } else if (!this.isActive && !this.builder && !this.isBuilding && !resources.get(this.source.tag)) {
        // Check if the vespene geyser changed tag
        const source = findUnitAtPoint(resources, this.source);

        if (source) {
          this.tag = source.tag;
        }

        return false;
      }

      if (this.builder) {
        unit = findUnitAtPoint(units, this.source);

        if (unit) {
          this.tag = unit.tag;
          this.isBuilding = true;
          delete this.builder;
        } else if (!this.builder.isActive) {
          this.isBuilding = false;
          delete this.builder;
        }
      }

      if (this.isBuilding && unit && (unit.buildProgress >= 1)) {
        this.isActive = true;
        this.isBuilding = false;
      }

      if (unit) {
        this.content = unit.vespeneContents;
      }

      return this.content ? true : (this.isActive = false);
    }
  }

  draftBooking(time, worker) {
    const harvestPoint = calculatePathEnd(worker.pos, this.pos, this.isMineral ? OFFSET_MINERAL : OFFSET_VESPENE);
    const boostPoint = calculatePathMid(worker.pos, harvestPoint);
    const boostDistance = calculateDistance(this.depot.pos, boostPoint);
    const distanceToHarvestPoint = calculateDistance(worker.pos, harvestPoint);
    const durationToHarvestPoint = estimateWalkTime(distanceToHarvestPoint);
    const estimatedArrivalTime = time + durationToHarvestPoint;
    const storePoint = calculatePathEnd(harvestPoint, this.depot.pos, OFFSET_DEPOT);

    if (estimatedArrivalTime > this.freeCheckInTime) {
      Monitor.add(Monitor.Mines, this.tag, "late", (estimatedArrivalTime - this.freeCheckInTime));
    } else if (this.freeCheckInTime > estimatedArrivalTime) {
      Monitor.add(Monitor.Mines, this.tag, "wait", (this.freeCheckInTime - estimatedArrivalTime));
    }

    return {
      harvestPoint: harvestPoint,
      boostToMineSquareDistance: (boostDistance - OFFSET_BOOST) * (boostDistance - OFFSET_BOOST),
      arrivalTime: estimatedArrivalTime,
      checkInTime: Math.max(this.freeCheckInTime, estimatedArrivalTime),
      waitDuration: Math.max(this.freeCheckInTime - estimatedArrivalTime, 0),
      storePoint: storePoint,
      boostToDepotSquareDistance: (boostDistance + OFFSET_BOOST) * (boostDistance + OFFSET_BOOST),
    }
  }

  makeReservation(worker, booking) {
    this.bookings.set(worker, booking);
    this.freeCheckInTime = booking.checkInTime + this.drillTime;
  }

  checkOut(time, worker) {
    const booking = this.bookings.get(worker);
    if (!this.bookings.delete(worker)) return;

    // Calculate how much time this mine was idle or blocked
    const jobReservationTime = Math.max(booking.arrivalTime, this.lastCheckOutTime);
    const jobDrillStartTime = time - this.drillTime;

    Monitor.add(Monitor.Mines, this.tag, Monitor.Used, this.drillTime);
    Monitor.add(Monitor.Mines, this.tag, Monitor.Idle, (jobDrillStartTime - this.lastCheckOutTime));
    if (jobReservationTime < jobDrillStartTime) {
      Monitor.add(Monitor.Mines, this.tag, Monitor.Blocked, (jobDrillStartTime - jobReservationTime));
    }

    // Calculate next free check-in time
    if (this.content > this.drillPack) {
      const arrivals = [];
      for (const [worker, booking] of this.bookings) {
        if (worker.isActive) {
          arrivals.push(booking.arrivalTime);
        }
      }
      arrivals.sort();
      let freeCheckInTime = time;
      for (const arrivalTime of arrivals) {
        freeCheckInTime = Math.max(freeCheckInTime, arrivalTime) + this.drillTime;
      }
      this.freeCheckInTime = freeCheckInTime;
    } else {
      this.freeCheckInTime = Infinity;
    }

    this.lastCheckOutTime = time;
  }

}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

function estimateWalkTime(distance) {
  return (distance >= 1.45) ? 17 + Math.ceil((distance - 1.45) / 0.1756) : 17;
}

function calculatePathMid(from, to) {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

function calculatePathEnd(from, to, radius) {
  const distance = calculateDistance(from, to);

  return {
    x: to.x + radius * (from.x - to.x) / distance,
    y: to.y + radius * (from.y - to.y) / distance,
  };
}

function getMineCenter(source, depot, line) {
  const distanceX = Math.abs(depot.pos.x - source.x);

  let offsetX = 0;

  if (distanceX > 2) {
    offsetX = (depot.pos.x - source.x > 0) ? 0.5 : -0.5;
  } else {
    // Check if an adjacent mine is blocking this mine from one side
    const blockingSpotY = source.y + Math.sign(depot.pos.y - source.y);
    const blockingSpotLeftX = source.x - 1;
    const blockingSpotRightX = source.x + 1;

    for (const one of line) {
      if (one.y === blockingSpotY) {
        if (one.x === blockingSpotRightX) {
          offsetX = -0.5;
          break;
        } else if (one.x === blockingSpotLeftX) {
          offsetX = 0.5;
          break;
        }
      }
    }
  }

  return {
    x: source.x + offsetX,
    y: source.y
  };
}

function findUnitAtPoint(units, pos) {
  for (const [_, one] of units) {
    if ((pos.x === one.pos.x) && (pos.y === one.pos.y)) {
      return one;
    }
  }
}
