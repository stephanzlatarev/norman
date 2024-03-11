import Hub from "../hub.js";
import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import WorkerBuild from "../jobs/WorkerBuild.js";
import Count from "../memo/count.js";
import Limit from "../memo/limit.js";
import Resources from "../memo/resources.js";

export default class BuildTechnologyMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        this.job = null;
      } else if (!this.job.isDone) {
        return;
      }
    }

    const type = Types.get(selectFactoryType());

    if (Count[type.name] >= Limit[type.name]) return;
    if (Resources.minerals < type.mineralCost) return;
    if (Resources.vespene < type.vespeneCost) return;

    const pos = findBuildingPlot();
    if (!pos) return;

    this.job = new WorkerBuild(type.name, pos);

    Resources.minerals -= type.mineralCost;
    Resources.vespene -= type.vespeneCost;
  }

}

function selectFactoryType() {
  return "Forge";
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
