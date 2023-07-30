import Monitor from "./monitor.js";
import { Status } from "./job.js";

const WORKERS = { 84: "probe" };

const knownWorkerTags = new Set();

export default class Worker {

  constructor(unit, depot) {
    if (unit) {
      this.init(unit);
    }

    this.isActive = !!unit;

    this.depot = depot;
    this.job = null;
    this.target = null;
    this.progress = null;
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

        if (this.order.abilityId) {
          const speed = ((this.pos.x - this.lastpos.x) * (this.pos.x - this.lastpos.x) + (this.pos.y - this.lastpos.y) * (this.pos.y - this.lastpos.y));
          const acceleration = speed - this.speed;
          if ((speed > 0) && (acceleration < 0) && (this.order.abilityId === this.lastorder.abilityId) && (this.speed / speed > 1.01)) {
            Monitor.add(Monitor.Workers, this.tag, Monitor.Slowing, 1);
          }

          this.speed = speed;
          this.acceleration = acceleration;
        } else {
          Monitor.add(Monitor.Workers, this.tag, Monitor.Idle, 1);
          this.speed = 0;
          this.acceleration = 0;
        }

        this.lastorder = this.order;
        this.lastpos.x = unit.pos.x;
        this.lastpos.y = unit.pos.y;

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
        if (WORKERS[unit.unitType] && !knownWorkerTags.has(tag)) {
          this.init(unit);
          this.isActive = true;
          break;
        }
      }

      return true;
    }
  }

  startJob(depot, job, target) {
    this.depot = depot;
    this.job = job;
    this.target = target;
    this.progress = null;
  }

  isWorking() {
    return (this.progress && (this.progress.jobStatus === Status.Progressing)) && (!this.depot || this.depot.isActive);
  }

}
