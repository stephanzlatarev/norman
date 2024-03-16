import Job from "../job.js";
import Order from "../order.js";

export default class Harvest extends Job {

  constructor(resource, depot) {
    super({ type: { isWorker: true }, depot: depot }, null, resource);
  }

  execute() {
    if (!this.order) {
      this.order = new Order(this.assignee, 298, this.target);
    }
  }

}
