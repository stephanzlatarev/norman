import Memory from "../../code/memory.js";

const depots = [];

export default class Depot extends Memory {

  // The workers assigned to this depot
  workers = new Set();

  // Is free when no depot building has been built at the location
  isFree = true;

  // Is active when the depot building is operational
  isActive = false;

  // Is staturated when enough workers are assigned to this depot
  isSaturated = false;

  constructor(location, rally, minerals, vespene) {
    super();

    this.d = 1;
    this.x = location.x;
    this.y = location.y;

    this.harvestRally = rally;
    this.exitRally = rally ? { x: location.x + location.x - rally.x, y: location.y + location.y - rally.y } : null;

    this.minerals = minerals;
    this.vespene = vespene;

    depots.push(this);
  }

  assignWorker(worker) {
    if (worker.depot) {
      worker.depot.releaseWorker(worker);
    }

    this.workers.add(worker);
    worker.depot = this;
  }

  releaseWorker(worker) {
    this.workers.delete(worker);
    worker.depot = null;
  }

  remove() {
    const index = depots.indexOf(this);

    if (index >= 0) {
      depots.splice(index, 1);
    }
  }

  static list() {
    return depots;
  }

  static order() {
    depots.sort((a, b) => (a.d - b.d));
  }

}
