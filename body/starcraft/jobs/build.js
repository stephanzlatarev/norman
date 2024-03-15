import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";
import Priority from "../memo/priority.js";

const Worker = Types.unit("Worker");

export default class Build extends Job {

  constructor(building, target, priority) {
    super("build " + building, (priority >= 0) ? priority : Priority[building], {
      assignee: { type: Worker }
    });

    this.action = (building > 0) ? building : Types.unit(building).abilityId;
    this.target = target;
  }

  execute() {
    if (!this.order) {
      this.order = new Order(this.assignee, this.action, this.target);
    } else if (this.order.isFailed) {
      this.close(false);
    } else if (this.order.isConfirmed) {
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
