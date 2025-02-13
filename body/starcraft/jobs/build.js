import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";

const ACKNOWLEDGE_TIME = 10;
const PROGRESS = { type: { name: "Progress" }, nick: "tracker", body: {}, isAlive: true, order: { abilityId: 1 } };

export default class Build extends Job {

  isAproaching = false;

  progress = 0;

  constructor(building, target) {
    super("Probe", building.name ? building : Types.unit(building), target);

    this.summary = this.constructor.name + " " + (building.name ? building.name : building);
  }

  accepts(unit) {
    // Damaged probes don't take build jobs
    if (unit.armor.total < unit.armor.totalMax) return false;

    return true;
  }

  execute() {
    if (!this.assignee.isAlive || this.assignee.isHit) {
      // The probe is under attack. Abort.
      console.log("Job", this.details, "aborted after worker was hit");
      this.abort();
    } else if (!this.order) {
      if ((this.assignee.zone !== this.target) && this.target.isDepot && this.target.minerals.size) {
        this.order = new Order(this.assignee, 298, [...this.target.minerals][0]).expect(this.output);
        this.order.isCompound = true;
        this.isAproaching = true;
      } else {
        this.order = new Order(this.assignee, this.output.abilityId, this.target).expect(this.output);
      }
    } else if (this.isAproaching) {
      if (isWorkerCloseToDepot(this.assignee, this.target)) {
        this.order.replace(this.output.abilityId, this.target).expect(this.output);
        this.order.isCompound = false;
        this.isAproaching = false;
      }
    } else if (this.order.isRejected) {
      this.close(false);
    } else if (this.order.isAccepted) {
      const pos = this.target.body || this.target;

      // Make sure the worker is at the right position and no longer has the command to build
      if (!this.progress && (this.assignee.order.abilityId !== this.output.abilityId) && isWorkerAtPosition(this.assignee, pos)) {
        this.assign(PROGRESS);
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

function isWorkerCloseToDepot(worker, pos) {
  return (Math.abs(worker.body.x - pos.x) < 15) && (Math.abs(worker.body.y - pos.y) < 15);
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
