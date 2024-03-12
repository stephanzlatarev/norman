import Hub from "../hub.js";
import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import Count from "../memo/count.js";
import Limit from "../memo/limit.js";
import Resources from "../memo/resources.js";

const FACILITIES = ["CyberneticsCore", "Forge"];

export default class BuildTechnologyMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        this.job = null;
      } else if (this.job.isDone) {
        FACILITIES.splice(0, 1);
        this.job = null;
      } else {
        return;
      }
    }

    if (!FACILITIES.length) return;

    const facility = Types.get(FACILITIES[0]);

    if (Count[facility.name] >= Limit[facility.name]) return;
    if (Resources.minerals < facility.mineralCost) return;
    if (Resources.vespene < facility.vespeneCost) return;

    const pos = findBuildingPlot();
    if (!pos) return;

    this.job = new Build(facility.name, pos);

    Resources.minerals -= facility.mineralCost;
    Resources.vespene -= facility.vespeneCost;
  }

}

function findBuildingPlot() {
  for (const hub of Hub.list()) {
    if (!hub.isPowered) continue;

    for (const plot of hub.buildingPlots) {
      if (plot.isFree) {
        if (isPositionTaken(plot)) {
          plot.isFree = false;
          continue;
        }

        return plot;
      }
    }
  }
}

function isPositionTaken(pos) {
  for (const building of Units.buildings().values()) {
    if (isSamePosition(pos, building.body)) {
      return true;
    }
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}
