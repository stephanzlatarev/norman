import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";

const Worker = Types.unit("Worker");

export default class Harvest extends Job {

  constructor(resource, depot) {
    super("harvest", 0, { type: Worker, depot: depot });

    this.resource = resource;
  }

  execute() {
    if (!this.order) {
      this.order = new Order(this.assignee, 298, this.resource);
    }
  }

}
