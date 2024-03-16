import Job from "../job.js";
import Order from "../order.js";

export default class Produce extends Job {

  constructor(facility, output) {
    super(facility, output);
  }

  execute() {
    if (!this.order) {
      const agent = this.assignee;
      const queue = this.assignee.order.queue;
      const abilityId = this.output.abilityId;

      this.order = new Order(this.assignee, this.output.abilityId, null, function() {
        if (queue) {
          return (agent.order.queue > queue);
        } else {
          return (agent.order.abilityId === abilityId);
        }
      });
    } else if (this.order.isRejected) {
      this.close(false);
    } else if (this.order.isAccepted) {
      // TODO: Calculate threshold based on ability build time
      if (!this.assignee.order.queue || ((this.assignee.order.queue === 1) && (this.assignee.order.progress > 0.95))) {
        this.close(true);
      }
    }
  }

}

