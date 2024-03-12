import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";
import Priority from "../memo/priority.js";

export default class BuildingTrain extends Job {

  constructor(trainee, facility, priority) {
    super("train", (priority >= 0) ? priority : Priority[trainee], {
      assignee: facility
    });

    this.action = (trainee > 0) ? trainee : Types.get(trainee).abilityId;
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
