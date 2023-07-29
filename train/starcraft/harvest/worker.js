import { Status } from "./job.js";

const WORKERS = { 84: "probe" };

const knownWorkerTags = new Set();

export default class Worker {

  constructor(unit) {
    if (unit) {
      this.init(unit);
    }

    this.isActive = !!unit;

    this.depot = null;
    this.job = null;
    this.target = null;
    this.progress = null;

    // TODO: Monitor activity of worker: blocked when waiting for a mine, idle when not having a job, waste when decelerating
  }

  init(unit) {
    this.tag = unit.tag;
    this.pos = { x: unit.pos.x, y: unit.pos.y };
    this.order = unit.orders.length ? unit.orders[0] : { abilityId: 0 };

    knownWorkerTags.add(unit.tag);
  }

  sync(units) {
    if (this.tag) {
      const unit = units.get(this.tag);

      if (unit) {
        this.pos.x = unit.pos.x;
        this.pos.y = unit.pos.y;
        this.order = unit.orders.length ? unit.orders[0] : { abilityId: 0 };
        // TODO: Monitor acceleration using speed = squared distance between current and previous position
      } else {
        this.isActive = false;
        knownWorkerTags.delete(this.tag);
      }

      return !!unit;
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
    return (this.progress && (this.progress.jobStatus === Status.Progressing));
  }

}
