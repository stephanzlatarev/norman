import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";
import Priority from "../memo/priority.js";

export default class Produce extends Job {

  constructor(product, facility, priority) {
    super("produce", (priority >= 0) ? priority : Priority[product], {
      assignee: facility
    });

    this.action = (product > 0) ? product : Types.get(product).abilityId;
  }

  execute() {
    if (!this.order) {
      this.order = new Order(this.assignee, this.action);
    } else if (this.order.isFailed) {
      this.close(false);
    } else if (this.order.isConfirmed && !this.assignee.order.abilityId) {
      this.close(true);
    }
  }

}
