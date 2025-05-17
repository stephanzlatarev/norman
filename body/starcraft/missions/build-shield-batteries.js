import Mission from "../mission.js";
import Build from "../jobs/build.js";
import Board from "../map/board.js";
import Depot from "../map/depot.js";
import Limit from "../memo/limit.js";
import { TotalCount } from "../memo/count.js";

export default class BuildShieldBatteriesMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        // This build job failed. Set the target on cooldown and open a new build job
        this.job = null;
      } else if (this.job.isDone) {
        // This build job is done. Free the build slot to open a new build job
        this.job = null;
      } else if (!this.job.assignee && !shouldBuildShieldBattery()) {
        // This build job is not assigned yet but priorities have meanwhile changed so close it
        this.job.close(false);
        this.job = null;
      } else {
        // This build job is still in progress
        return;
      }
    }

    if (!Depot.home) return;
    if (!shouldBuildShieldBattery()) return;

    const plot = findBuildingPlot();

    if (plot) {
      this.job = new Build("ShieldBattery", plot);
    }
  }

}

function shouldBuildShieldBattery() {
  return (Limit.ShieldBattery) && !TotalCount.ShieldBattery;
}

function findBuildingPlot() {
  for (const site of Depot.home.sites) {
    for (const plot of site.battery) {
      if (isPlotFree(plot)) {
        return plot;
      }
    }
  }
}

function isPlotFree(plot) {
  for (let x = plot.x - 1; x <= plot.x + 1; x++) {
    for (let y = plot.y - 1; y <= plot.y; y++) {
      const cell = Board.cell(x, y);

      if (cell.isObstructed()) {
        return false;
      }
    }
  }

  return true;
}
