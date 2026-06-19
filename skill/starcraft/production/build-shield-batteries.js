import { Build, Board, Depot, Limit, Priority, TotalCount } from "./imports.js";

let job;

export default function() {
  if (job) {
    if (job.isFailed) {
      // This build job failed. Set the target on cooldown and open a new build job
      job = null;
    } else if (job.isDone) {
      // This build job is done. Free the build slot to open a new build job
      job = null;
    } else if (!job.assignee && !shouldBuildShieldBattery()) {
      // This build job is not assigned yet but priorities have meanwhile changed so close it
      job.close(false);
      job = null;
    } else {
      // This build job is still in progress
      return;
    }
  }

  if (!Depot.home) return;
  if (!shouldBuildShieldBattery()) return;

  const plot = findBuildingPlot();

  if (plot) {
    job = new Build("ShieldBattery", plot);
  }
}

function shouldBuildShieldBattery() {
  return Priority.ShieldBattery && Limit.ShieldBattery && !TotalCount.ShieldBattery;
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
  for (let x = plot.x - 1; x <= plot.x; x++) {
    for (let y = plot.y - 1; y <= plot.y; y++) {
      const cell = Board.cell(x, y);

      if (cell.isObstructed()) {
        return false;
      }
    }
  }

  return true;
}
