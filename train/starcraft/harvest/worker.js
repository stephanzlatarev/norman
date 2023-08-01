import Monitor from "./monitor.js";
import { Status } from "./job.js";

const WORKERS = { 84: "probe" };
const COOLDOWN_WEAPON = 10;

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

        this.canAttack = (unit.weaponCooldown <= COOLDOWN_WEAPON);

        if (this.order.abilityId) {
          const step = (this.order.abilityId === this.lastorder.abilityId) ? this.step + 1 : 0;
          const speed = ((this.pos.x - this.lastpos.x) * (this.pos.x - this.lastpos.x) + (this.pos.y - this.lastpos.y) * (this.pos.y - this.lastpos.y));
          const acceleration = speed - this.speed;

          Monitor.add(Monitor.Workers, this.tag, getMetric(this, step, speed, acceleration), 1);

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

        this.tracing = unit.isSelected;

        { // Tracing. Remove when ready to upload to norman 
          const trace = [];
          trace.push("speed:", (this.acceleration * 100000).toFixed(2) + ">>" + (this.speed * 100000).toFixed(2));
          if (this.order) trace.push("order:", this.order.abilityId);
          if (this.order && this.order.targetUnitTag) trace.push(this.order.targetUnitTag);
          if (this.order && this.order.targetWorldSpacePos) trace.push(this.order.targetWorldSpacePos.x.toFixed(2) + ":" + this.order.targetWorldSpacePos.y.toFixed(2));
          if (this.progress) trace.push(`job: ${this.progress.jobStatus} task: ${this.progress.taskIndex} ${this.progress.taskStatus}`);
          this.trace(trace.join(" "));
        } // Tracing. Remove when ready to upload to norman

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

  startJob(depot, job, target) {
    this.depot = depot;
    this.job = job;
    this.target = target;
    this.progress = { jobStatus: Status.New };
  }

  isWorking() {
    const hasJob = (this.progress && ((this.progress.jobStatus === Status.Progressing) || (this.progress.jobStatus === Status.New)));
    const jobIsActive = (!this.depot || this.depot.isActive);
    return hasJob && jobIsActive;
  }

  // TODO: Remove when ready to upload to norman
  trace() {
    if (this.tracing) {
      let distance = "-";
      if (this.depot) {
        const dx = this.depot.pos.x;
        const dy = this.depot.pos.y;
        const wx = this.pos.x;
        const wy = this.pos.y;
        distance = Math.sqrt((wx - dx) * (wx - dx) + (wy - dy) * (wy - dy)).toFixed(4);
      }
      console.log(`[worker ${this.tag} ${this.pos.x.toFixed(2)}:${this.pos.y.toFixed(2)} ${distance}]`, ...arguments);
    }
  }

}

function near(a, b) {
  return ((Math.abs(a.x - b.x) < 10) && (Math.abs(a.y - b.y) < 10));
}

function getMetric(worker, step, speed, acceleration) {
  if ((step > 1) && (speed > 0) && (-acceleration/speed > 0.1)) return "slowing";

  switch (worker.order.abilityId) {
    case 16: return "pushing";
    case 298: return (speed > 0) ? "approching mine" : "gathering";
    case 299: {
      if (worker.order.targetUnitTag) {
        return (speed > 0) ? "approching depot" : "storing";
      } else {
        return "packing";
      }
    }
  }
}
