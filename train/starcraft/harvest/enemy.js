import { AttackJob } from "./job.js";

export default class Enemy {

  constructor(unit) {
    this.tag = unit.tag;
    this.pos = unit.pos;
  }

  sync(units) {
    const unit = units.get(this.tag);

    if (unit) {
      this.pos = unit.pos;
      return true;
    } else {
      this.isActive = false;
      return false;
    }
  }

  attack(worker) {
    worker.startJob(worker.depot, AttackJob, this);
  }

}
