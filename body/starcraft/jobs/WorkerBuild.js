import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";
import Priority from "../memo/priority.js";

const Worker = Types.get("Worker");

export default class WorkerBuild extends Job {

  constructor(building, pos, priority) {
    super("build " + building, (priority >= 0) ? priority : Priority[building], {
      assignee: { type: Worker }
    });

    this.action = (building > 0) ? building : Types.get(building).actionToBuild;
    this.pos = pos;
  }

  execute() {
    if (!this.order) {
      this.order = new Order(this.assignee, this.action, this.pos);
    } else if (this.order.isFailed) {
      this.close(false);
    } else if (this.order.isConfirmed) {
      if (isWorkerAtPosition(this.assignee, this.pos) && existsBuilding(this.pos)) {
        this.close(true);
      }
    }
  }

}

function isWorkerAtPosition(worker, pos) {
  return (Math.abs(worker.body.x - pos.x) < 3) && (Math.abs(worker.body.y - pos.y) < 3);
}

function existsBuilding(pos) {
  for (const building of Units.buildings().values()) {
    if ((building.body.x === pos.x) && (building.body.y === pos.y)) {
      return true;
    }
  }
}
