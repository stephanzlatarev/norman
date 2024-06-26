import Job from "../job.js";
import Order from "../order.js";

export default class Attack extends Job {

  constructor(warrior, target) {
    super(warrior, null, target);

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
