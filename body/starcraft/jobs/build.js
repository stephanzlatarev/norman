import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";

export default class Build extends Job {

  constructor(building, target) {
    super("Worker", building.name ? building : Types.unit(building), target);
  }

  execute() {
    if (!this.order) {
      this.order = new Order(this.assignee, this.output.abilityId, this.target);
    } else if (this.order.isRejected) {
      this.close(false);
    } else if (this.order.isAccepted) {
      const pos = this.target.body || this.target;

      if (isWorkerAtPosition(this.assignee, pos)) {
        const building = findBuilding(pos);

        if (building) {
          this.close(building);
        }
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
