import Job from "../job.js";
import Order from "../order.js";

export default class Produce extends Job {

  constructor(facility, output) {
    super(facility, output);
  }

  execute() {
    if (!this.order) {
      this.order = new Order(this.assignee, this.output.abilityId);
    } else if (this.order.isFailed) {
      this.close(false);
    } else if (this.order.isConfirmed && !this.assignee.order.abilityId) {
      this.close(true);
    }
  }

}
