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
      const progress = this.assignee.order.progress;
      const abilityId = this.output.abilityId;

      this.order = new Order(agent, abilityId).expect(this.output).accept(function() {
        if (queue) {
          if (agent.order.queue === queue) {
            // The newly accepted order must have replaced the previous order
            return ((agent.order.abilityId === abilityId) && (agent.order.progress < progress));
          }

          // The newly accepted order must be added to the queue after the previous order
          return (agent.order.queue > queue);
        } else {
          // When there was no previous order then this must be the first order for the agent
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
