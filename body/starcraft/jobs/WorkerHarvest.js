import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";

const Worker = Types.get("Worker");

export default class WorkerHarvest extends Job {

  constructor(resource, depot) {
    super("harvest", 0, {
      assignee: { type: Worker, depot: depot }
    });

    this.resource = resource;
  }

  execute() {
    if (!this.order) {
      this.order = new Order(this.assignee, 298, this.resource);
    }
  }

}
