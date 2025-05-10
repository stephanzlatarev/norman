import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import { ALERT_WHITE, ALERT_YELLOW } from "../map/alert.js";
import Board from "../map/board.js";
import Depot from "../map/depot.js";
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
  return findHomeBaseSitePlot() || findSitePlotOfType("pylon") || findSitePlotOfType("small");
}

function findHomeBaseSitePlot() {
  const zone = Depot.home;

  if (!zone) return;
  if (zone.alertLevel > ALERT_YELLOW) return;
  if (shouldAvoidZone(zone)) return;

  let bestDistance = 0;
  let bestPlot;

  for (const site of zone.sites) {
    let distance = 0;

    for (const building of zone.buildings) {
      distance += calculateDistance(site, building.body);
    }

    if (distance > bestDistance) {
      for (const plot of site.pylon) {
        if (isPlotFree(plot)) {
          bestDistance = distance;
          bestPlot = plot;
          break;
        }
      }
    }
  }

  return bestPlot;
}

function findSitePlotOfType(type) {
  for (const zone of Depot.list()) {
    if (!zone.depot) continue;
    if ((zone.alertLevel > ALERT_WHITE) || shouldAvoidZone(zone)) continue;

    for (const site of zone.sites) {
      for (const plot of site[type]) {
        if (isPlotFree(plot)) {
          return plot;
        }
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

function avoidZone(job) {
  if (!job || !job.target || !job.target.x || !job.target.y) return;

  const cell = Board.cell(job.target.x, job.target.y);

  if (!cell || !cell.zone) return;
  if (cell.zone === Depot.home) return;

  avoid.set(cell.zone, Resources.loop + AVOID_LOOPS);
}

function shouldAvoidZone(zone) {
  const avoidUntilLoop = avoid.get(zone);

  return (avoidUntilLoop && (Resources.loop < avoidUntilLoop));
}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
