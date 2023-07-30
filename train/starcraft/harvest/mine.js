import Monitor from "./monitor.js";

const RADIUS_WORKER = 0.375;
const RADIUS_MINERAL = 1.125 / 2;
const RADIUS_DEPOT = 2.75;
const DRILL_TIME = 46;

export default class Mine {

  constructor(unit, depot, line) {
    this.unit = { pos: unit.pos };
    this.tag = unit.tag;

    this.content = Infinity;

    this.bookings = new Map();
    this.lastCheckOutTime = 0;
    this.freeCheckInTime = 0;

    this.position(depot, line);
  }

  position(depot, line) {
    this.pos = getMineCenter(this.unit, depot, line);

    const harvestPoint = calculatePathEnd(depot.pos, this.pos, RADIUS_WORKER + RADIUS_MINERAL);
    const storePoint = calculatePathEnd(this.pos, depot.pos, RADIUS_WORKER + RADIUS_DEPOT);
    const distance = calculateDistance(harvestPoint, storePoint);

    this.route = {
      harvestPoint: harvestPoint,
      storePoint: storePoint,
      distance: distance,
      walkTime: estimateWalkTime(distance),
      boost: Math.max(distance / 2, 1.75),
    };
  }

  sync(units) {
    let unit = units.get(this.tag);

    if (!unit) {
      // Check if the unit changed tag
      for (const [_, one] of units) {
        if ((this.unit.pos.x === one.pos.x) && (this.unit.pos.y === one.pos.y)) {
          unit = one;
          break;
        }
      }

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
    }

    return (unit && this.content);
  }

  draftBooking(time, worker) {
    const routeDistance = (worker.target === this) ? this.harvestToStoreWalkTime : calculateDistance(worker.pos, this.route.harvestPoint);
    const routeDuration = estimateWalkTime(routeDistance);
    const estimatedArrivalTime = time + routeDuration;

    return {
      arrivalTime: estimatedArrivalTime,
      checkInTime: Math.max(this.freeCheckInTime, estimatedArrivalTime),
      waitDuration: Math.max(this.freeCheckInTime - estimatedArrivalTime, 0),
    }
  }

  makeReservation(worker, booking) {
    this.bookings.set(worker, booking);
    this.freeCheckInTime = booking.checkInTime + DRILL_TIME;
  }

  checkOut(time, worker) {
    const booking = this.bookings.get(worker);
    if (!this.bookings.delete(worker)) return;

    // Calculate how much time this mine was idle or blocked
    const jobReservationTime = Math.max(booking.arrivalTime, this.lastCheckOutTime);
    const jobDrillStartTime = time - DRILL_TIME;

    Monitor.add(Monitor.Mines, this.tag, Monitor.Used, DRILL_TIME);
    if (jobReservationTime < jobDrillStartTime) {
      Monitor.add(Monitor.Workers, worker.tag, Monitor.Idle, (jobReservationTime - this.lastCheckOutTime));
      Monitor.add(Monitor.Workers, worker.tag, Monitor.Blocked, (jobDrillStartTime - jobReservationTime));
    } else {
      Monitor.add(Monitor.Workers, worker.tag, Monitor.Idle, (jobDrillStartTime - this.lastCheckOutTime));
    }

    // Calculate next free check-in time
    if (this.content > 5) {
      const arrivals = [];
      for (const [worker, booking] of this.bookings) {
        if (worker.isActive) {
          arrivals.push(booking.arrivalTime);
        }
      }
      arrivals.sort();
      let freeCheckInTime = time;
      for (const arrivalTime of arrivals) {
        freeCheckInTime = Math.max(freeCheckInTime, arrivalTime + DRILL_TIME);
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

function calculatePathEnd(from, to, radius) {
  const distance = calculateDistance(from, to);

  return {
    x: to.x + radius * (from.x - to.x) / distance,
    y: to.y + radius * (from.y - to.y) / distance,
  };
}

function getMineCenter(unit, depot, line) {
  const distanceX = Math.abs(depot.pos.x - unit.pos.x);

  let offsetX = 0;

  if (distanceX > 2) {
    offsetX = (depot.pos.x - unit.pos.x > 0) ? 0.5 : -0.5;
  } else {
    // Check if an adjacent mine is blocking this mine from one side
    const blockingSpotY = unit.pos.y + Math.sign(depot.pos.y - unit.pos.y);
    const blockingSpotLeftX = unit.pos.x - 1;
    const blockingSpotRightX = unit.pos.x + 1;

    for (const one of line) {
      if (one.pos.y === blockingSpotY) {
        if (one.pos.x === blockingSpotRightX) {
          offsetX = -0.5;
          break;
        } else if (one.pos.x === blockingSpotLeftX) {
          offsetX = 0.5;
          break;
        }
      }
    }
  }

  return {
    x: unit.pos.x + offsetX,
    y: unit.pos.y
  };
}
