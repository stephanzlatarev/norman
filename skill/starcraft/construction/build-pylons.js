import { Board, Build, Depot, Types, Units, ALERT_WHITE } from "./imports.js";
import { ActiveCount, TotalCount, Resources } from "./imports.js";

// TODO: Calculate time to new supply from nexuses and pylons in progress of building. Calculate time to supply cap looking at production facilities and ordered units. Build pylons just in time.

const AVOID_LOOPS = 20 * 22.4; // 20 seconds

const avoid = new Map();
let job = null;

export default function() {
  if (job) {
    if (job.isFailed) {
      avoidZone(job);

      job = null;
    } else if (!job.isDone) {
      return;
    }
  }

  // Check if it's too early for a second pylon
  if ((Resources.supplyUsed < 20) && (TotalCount.Pylon >= 1)) return;

  const plot = findPylonForSupply();

  if (plot) {
    job = new Build("Pylon", plot);
    job.priority = 100;
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
  return findFirstPylonPlot() || findHomeBaseSitePlot() || findSitePlotOfType("pylon") || findSitePlotOfType("small");
}

// The first pylon is placed at the wall site of the home base
function findFirstPylonPlot() {
  if (!Depot.home) return;
  if (TotalCount.Pylon) return;

  return Depot.home.sites.find(site => site.isWall)?.pylon[0];
}

// Pylons at the home base are placed with maximum distance from each other to increase vision
function findHomeBaseSitePlot() {
  if (!Depot.home) return;

  let bestDistance = 0;
  let bestPlot;

  for (const site of Depot.home.sites) {
    let distance = 0;

    for (const building of Depot.home.buildings) {
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
