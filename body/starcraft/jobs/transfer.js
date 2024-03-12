import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";

const Worker = Types.get("Worker");

export default class Transfer extends Job {

  constructor(fromDepot, toDepot) {
    super("transfer", 1, {
      assignee: { type: Worker, depot: fromDepot }
    });

    this.depot = toDepot;
  }

  execute() {
    if (!this.order) {
      const minerals = this.depot.minerals[0];

      this.order = new Order(this.assignee, 298, minerals);

      this.depot.assignWorker(this.assignee);
    } else if (this.order.isFailed) {
      this.close(false);
    } else if (this.order.isConfirmed && this.depot.isActive) {
      this.close(true);
    }
  }

}
