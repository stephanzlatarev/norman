import Job from "../job.js";
import Order from "../order.js";

export default class Transfer extends Job {

  constructor(fromDepot, toDepot) {
    super({ type: { isWorker: true }, depot: fromDepot }, null, toDepot);
  }

  execute() {
    if (!this.order) {
      const minerals = this.target.minerals[0];

      this.order = new Order(this.assignee, 298, minerals);

      this.target.assignWorker(this.assignee);
    } else if (this.order.isRejected) {
      this.close(false);
    } else if (this.order.isAccepted && this.target.isActive) {
      this.close(true);
    }
  }

}
