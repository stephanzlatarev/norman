import { Memory, Board, Build, Depot, Job, TotalCount } from "../imports.js";

const PYLON = "Pylon";
const SHIELD_BATTERY = "ShieldBattery";

export default function() {
  if (Memory.DeploymentOutreach !== Memory.DeploymentOutreachNormalDefense) return;
  if (TotalCount.Nexus <= 1) return;

  const expo = findExpo();
  if (findShieldBattery(expo)) return;

  const pylon = findPylon(expo);

  if (pylon) {
    // If pylon is not active, wait for it
    if (!pylon.isActive) return;

    let job = findBuildJob(expo, SHIELD_BATTERY);

    // If build job is open, wait for it
    if (job) return;

    job = new Build(SHIELD_BATTERY, { x: pylon.body.x + 2, y: pylon.body.y });
    job.priority = 100;
    job.zone = expo;
  } else {
    let job = findBuildJob(expo, PYLON);

    // If build job is open, wait for it
    if (job) return;

    const exit = findExpoExit(expo);
    const plot = findPylonPlot(expo, exit);

    if (plot) {
      job = new Build(PYLON, plot);
      job.priority = 100;
      job.zone = expo;
    }
  }
}

function findExpo() {
  let previous = Depot.home;

  for (const depot of Depot.list()) {
    if (!depot.depot) return previous;

    previous = depot;
  }

  return previous;
}

function findExpoExit(zone) {
  let best;

  for (const exit of zone.exits.values()) {
    if (!exit.via) continue;
    if (exit.isAir) continue;
    if (exit.isCliff) continue;

    if (!best || (exit.via.perimeterLevel > best.perimeterLevel)) {
      best = exit.via;
    }
  }

  return best;
}

function findBuildJob(zone, building) {
  for (const job of Job.list()) {
    if (!job.isBuildJob) continue;
    if (!job.output || (job.output.name !== building)) continue;
    if (job.zone !== zone) continue;

    return job;
  }
}

function findShieldBattery(zone) {
  for (const building of zone.buildings) {
    if (building.type.name === "ShieldBattery") return building;
  }
}

// Find the frontier pylon in the given zone
function findPylon(zone) {
  for (const building of zone.buildings) {
    if (!building.type.isPylon) continue;

    return building;
  }
}

function findPylonPlot(zone, exit) {
  let bestDistance = Infinity;
  let bestPlot;

  for (const site of zone.sites) {
    for (const plot of site.pylon) {
      if (!isPlotFree(plot)) continue;

      const distance = calculateSquareDistance(plot, exit);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestPlot = plot;
        break;
      }
    }
  }

  return bestPlot;
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

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
