import Mission from "../mission.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import Depot from "../map/depot.js";
import Count from "../memo/count.js";
import Limit from "../memo/limit.js";
import Resources from "../memo/resources.js";

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

    if (Count.Nexus >= Limit.Nexus) return;
    if (Resources.minerals < 400) return;

    const pos = findDepotLocation();
    if (!pos) return;

    this.job = new Build("Nexus", pos);

    Resources.minerals -= 400;
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
