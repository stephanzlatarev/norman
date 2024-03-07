import Job from "../job.js";
import Order from "../order.js";

export default class Attack extends Job {

  constructor(warrior, target) {
    super("attack", 100, {
      assignee: warrior
    });

    this.target = target;
  }

  execute() {
    if (!this.order) {
      this.order = new Order(this.assignee, 3674, this.target);
    } else if (this.order.isFailed) {
      this.close(false);
    }
  }

}
