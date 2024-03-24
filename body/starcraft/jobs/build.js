import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";

const ACKNOWLEDGE_TIME = 10;

export default class Build extends Job {

  progress = 0;

  constructor(building, target) {
    super("Worker", building.name ? building : Types.unit(building), target);
  }

  execute() {
    if (!this.order) {
      this.order = new Order(this.assignee, this.output.abilityId, this.target).expect(this.output);
    } else if (this.order.isRejected) {
      this.close(false);
    } else if (this.order.isAccepted) {
      const pos = this.target.body || this.target;

      // Make sure the worker is at the right position and no longer has the command to build
      if (!this.progress && (this.assignee.order.abilityId !== this.output.abilityId) && isWorkerAtPosition(this.assignee, pos)) {
        this.progress = 1;
      }

      // Close the job when the building appears
      if (this.progress) {
        const building = findBuilding(pos);

        if (building) {
          this.close(building);
        } else if (this.progress > ACKNOWLEDGE_TIME) {
          // Although the worker is at the right position and no longer has the command to build, the building hasn't appeared for this long
          this.close(false);
        }

        this.progress++;
      }
    }
  }

}

function isWorkerAtPosition(worker, pos) {
  return (Math.abs(worker.body.x - pos.x) < 3) && (Math.abs(worker.body.y - pos.y) < 3);
}

function findBuilding(pos) {
  for (const building of Units.buildings().values()) {
    if ((building.body.x === pos.x) && (building.body.y === pos.y)) {
      return building;
    }
  }
}
