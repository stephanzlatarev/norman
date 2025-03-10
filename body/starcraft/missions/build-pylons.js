import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import { ALERT_WHITE } from "../map/alert.js";
import Board from "../map/board.js";
import Tiers from "../map/tier.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import Resources from "../memo/resources.js";

// TODO: Calculate time to new supply from nexuses and pylons in progress of building. Calculate time to supply cap looking at production facilities and ordered units. Build pylons just in time.

const AVOID_LOOPS = 20 * 22.4; // 20 seconds

const avoid = new Map();

export default class BuildPylonsMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        avoidZone(this.job);

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

  // First try to find a pylon plot in the center of a zone in our perimeter
  for (let index = 0; index <= 1; index++) {
    const zones = Tiers[index].zones;

    for (const zone of zones) {
      if ((zone.alertLevel <= ALERT_WHITE) && !shouldAvoidZone(zone) && isPlotFree(zone.powerPlot)) {
        return zone.powerPlot;
      }
    }
  }

  // Next try to add a pylon next to a base
  for (const zone of Tiers[0].zones) {
    for (const dy of [+2, -2, +4, -4]) {
      const plot = { x: zone.powerPlot.x, y: zone.powerPlot.y + dy };

      if (!shouldAvoidZone(zone) && isPlotFree(plot)) {
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

function avoidZone(job) {
  if (!job || !job.target || !job.target.x || !job.target.y) return;

  const cell = Board.cell(job.target.x, job.target.y);

  if (!cell || !cell.zone) return;

  avoid.set(cell.zone, Resources.loop + AVOID_LOOPS);
}

function shouldAvoidZone(zone) {
  const avoidUntilLoop = avoid.get(zone);

  return (avoidUntilLoop && (Resources.loop < avoidUntilLoop));
}
