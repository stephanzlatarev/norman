import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import { ALERT_WHITE } from "../map/alert.js";
import Board from "../map/board.js";
import Tiers from "../map/tier.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import Plan from "../memo/plan.js";
import Resources from "../memo/resources.js";

// TODO: Calculate time to new supply from nexuses and pylons in progress of building. Calculate time to supply cap looking at production facilities and ordered units. Build pylons just in time.

export default class BuildPylonsMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        this.job = null;
      } else if (!this.job.isDone) {
        return;
      }
    }

    // Check if it's too early for a second pylon
    if ((Resources.supplyUsed < 20) && (TotalCount.Pylon >= 1)) return;

    const plot = findPylonForSupply();

    if (plot) {
      this.job = new Build("Pylon", plot);
      this.job.priority = 100;
    }
  }

}

function findPylonForSupply() {
  if (Resources.supplyLimit >= 200) return;

  // TODO: Also count a nexus when currently building but only if remaining time to build is the same as the time to build a pylon
  const expectedSupply = ActiveCount.Nexus * 15 + TotalCount.Pylon * 8;

  if (Resources.supplyUsed + 8 >= expectedSupply) {
    return findPylonPlot();
  }

  const timeToConsumeSupply = (expectedSupply - Resources.supplyUsed) / countSupplyConsumptionRate();
  const timeToIncreaseSupply = Types.unit("Pylon").buildTime + 5 * 22.4; // Assume 5 seconds for probe to reach pylon construction site

  if (timeToConsumeSupply <= timeToIncreaseSupply) {
    return findPylonPlot();
  }
}

function countSupplyConsumptionRate() {
  let consumption = 0;

  for (const building of Units.buildings().values()) {
    if (building.type.supplyConsumptionRate) {
      consumption += building.type.supplyConsumptionRate;
    }
  }

  return consumption;
}

function findPylonPlot() {
  if (!Tiers.length) return;

  const tierIndexLimit = Math.min(Plan.BaseLimit ? 1 : 2, Tiers.length);

  // First try to find a pylon plot in the center of a zone in our perimeter
  for (let index = 0; index < tierIndexLimit; index++) {
    const zones = Tiers[index].zones;

    for (const zone of zones) {
      if ((zone.alertLevel <= ALERT_WHITE) && isPlotFree(zone.powerPlot)) {
        return zone.powerPlot;
      }
    }
  }

  // Next try to add a pylon next to a base
  for (const zone of Tiers[0].zones) {
    for (const dy of [+2, -2, +4, -4]) {
      const plot = { x: zone.powerPlot.x, y: zone.powerPlot.y + dy };

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

      if (!cell.isPlot || !cell.isPath) {
        return false;
      }
    }
  }

  return true;
}
