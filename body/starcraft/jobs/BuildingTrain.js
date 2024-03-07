import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";
import Priority from "../memo/priority.js";

const Building = Types.get("Building");

export default class BuildingTrain extends Job {

  constructor(trainee, factory, priority) {
    super("train", (priority >= 0) ? priority : Priority[trainee], {
      assignee: factory ? factory : { type: Building }
    });

    this.action = (trainee > 0) ? trainee : Types.get(trainee).actionToBuild;
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
