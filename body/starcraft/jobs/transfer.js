import Job from "../job.js";
import Order from "../order.js";

export default class Transfer extends Job {

  constructor(fromDepot, toDepot) {
    super("Probe", null, toDepot);

    this.priority = 50;
    this.zone = fromDepot;
    this.summary = this.constructor.name + " " + fromDepot.name + " to " + toDepot.name;
    this.details = this.summary;
  }

  accepts(unit) {
    return (unit.depot === this.zone);
  }

  execute() {
    if (!this.assignee.isAlive) return this.close(false);

    if (!this.order) {
      const minerals = this.target.minerals[0];

      this.order = new Order(this.assignee, 298, minerals);

      this.target.assignWorker(this.assignee);
    } else if (this.order.isRejected) {
      this.close(false);
    } else if (this.order.isAccepted && this.target.isActive && (this.assignee.depot === this.target)) {
      this.close(true);
    }
  }

}
