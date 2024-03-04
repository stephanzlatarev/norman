import Monitor from "./monitor.js";
import { Status } from "./job.js";
import { WORKERS } from "../units.js";

const COOLDOWN_WEAPON = 10;

const knownWorkerTags = new Set();

export default class Worker {

  static exists(unit) {
    return knownWorkerTags.has(unit.tag);
  }

  constructor(unit, depot) {
    if (unit) {
      this.init(unit);
    }

    this.isActive = !!unit;

    this.depot = depot;
    this.job = null;
    this.target = null;
    this.progress = null;

    this.canAttack = true;
  }

  init(unit) {
    this.tag = unit.tag;
    this.pos = { x: unit.pos.x, y: unit.pos.y };
    this.lastpos = { x: unit.pos.x, y: unit.pos.y };
    this.order = unit.orders.length ? unit.orders[0] : { abilityId: 0 };
    this.lastorder = this.order;

    knownWorkerTags.add(unit.tag);
  }

  sync(units) {
    if (this.tag) {
      const unit = units.get(this.tag);

      if (unit) {
        this.pos.x = unit.pos.x;
        this.pos.y = unit.pos.y;
        this.order = unit.orders.length ? unit.orders[0] : { abilityId: 0 };

        this.isObserved = true;
        this.isBusy = !!unit.isBusy;
        this.canAttack = (unit.weaponCooldown <= COOLDOWN_WEAPON);

        if (this.order.abilityId) {
          const step = (this.order.abilityId === this.lastorder.abilityId) ? this.step + 1 : 0;
          const speed = ((this.pos.x - this.lastpos.x) * (this.pos.x - this.lastpos.x) + (this.pos.y - this.lastpos.y) * (this.pos.y - this.lastpos.y));
          const acceleration = speed - this.speed;

          const metric = getMetric(this, step, speed, acceleration);
          if (metric) Monitor.add(Monitor.Workers, this.tag, metric, 1);

          this.step = step;
          this.speed = speed;
          this.acceleration = acceleration;
        } else {
          Monitor.add(Monitor.Workers, this.tag, Monitor.Idle, 1);

          this.step = 0;
          this.speed = 0;
          this.acceleration = 0;
        }

        this.lastorder = this.order;
        this.lastpos.x = unit.pos.x;
        this.lastpos.y = unit.pos.y;

        return true;
      } else if (this.canBeMissingInObservation) {
        return true;
      } else {
        this.isActive = false;
        knownWorkerTags.delete(this.tag);

        return false;
      }
    } else if (this.depot && !this.depot.isActive) {
      // The depot was destroyed while building this worker
      return false;
    } else {
      for (const [tag, unit] of units) {
        if (WORKERS[unit.unitType] && !knownWorkerTags.has(tag) && (!this.depot || near(unit.pos, this.depot.pos))) {
          this.init(unit);
          this.isActive = true;
          break;
        }
      }

      return true;
    }
  }

  startJob(depot, job, target, route) {
    this.depot = depot;
    this.job = job;
    this.target = target;
    this.route = route;
    this.progress = { jobStatus: Status.New };
  }

  isWorking() {
    const hasJob = (this.progress && ((this.progress.jobStatus === Status.Progressing) || (this.progress.jobStatus === Status.New)));
    const jobIsActive = (!this.depot || !!this.depot.isActive);
    return this.isBusy || (hasJob && jobIsActive);
  }

}

function near(a, b) {
  return ((Math.abs(a.x - b.x) < 10) && (Math.abs(a.y - b.y) < 10));
}

function getMetric(worker, step, speed, acceleration) {
  if ((step > 1) && (speed > 0) && (-acceleration/speed > 0.1)) {
    switch (worker.order.abilityId) {
      case 16: return "slow push " + (worker.progress ? worker.progress.taskIndex : "x");
      case 298: return "slow to mine";
      case 299: return "slow to depot";
    }
  }
}
