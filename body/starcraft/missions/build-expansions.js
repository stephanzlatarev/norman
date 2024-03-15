import Mission from "../mission.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import Depot from "../map/depot.js";

export default class BuildExpansionsMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        this.job = null;
      } else if (!this.job.isDone) {
        return;
      }
    }

    const pos = findDepotLocation();

    if (pos) {
      this.job = new Build("Nexus", pos);
    }
  }

}

function findDepotLocation() {
  const nexuses = [];

  for (const building of Units.buildings().values()) {
    if (building.type.isDepot) {
      nexuses.push(building);
    }
  }

  for (const depot of Depot.list()) {
    if (depot.isFree) {
      if (isPositionTaken(depot, nexuses)) {
        depot.isFree = false;
        continue;
      }

      return depot;
    }
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}

function isPositionTaken(pos) {
  for (const building of Units.buildings().values()) {
    if (isSamePosition(pos, building.body)) {
      return true;
    }
  }
}
