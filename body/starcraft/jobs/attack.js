import Job from "../job.js";
import Order from "../order.js";

export default class Attack extends Job {

  constructor(warrior, zone, target) {
    super(warrior, null, target);

    this.zone = zone;
    this.priority = 100;
  }

  execute() {
    if (!this.order) {
      this.order = new Order(this.assignee, 23, this.target);
    } else if (this.order.isRejected) {
      this.close(false);
    }
  }

}
