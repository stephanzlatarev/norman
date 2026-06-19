import { Board, Build, Depot, Memory, Units, VisibleCount, info } from "./imports.js";

const TIME_WINDOW = 6 * 60 * 22.4; // 6 minutes
const PSIONIC_MATRIX_RADIUS = 6.5;

const MAX_DISTANCE = 1 + 7 + 1 - 0.1;
const MAX_SQUARE_DISTANCE = MAX_DISTANCE * MAX_DISTANCE;

const protectedDepots = new Set();
let isFusionCoreDetected = false;
let cooldown = 0;
let job = null;

export default function() {
  if (Memory.Loop > TIME_WINDOW) return;
  if (Memory.Loop < cooldown) return;

  if (!isFusionCoreDetected && VisibleCount.FusionCore) {
    info("strategy", "Early enemy Fusion Core detected. Potential mineral line harassment.");
    isFusionCoreDetected = true;
  }

  if (job) {
    if (job.isDone || job.isFailed) {
      job = null;
    } else {
      // Still building
      return;
    }
  }

  if (isFusionCoreDetected) {
    for (const depot of Depot.list()) {
      if (depot.depot && !protectedDepots.has(depot)) {
        protectDepot(depot);
      }
    }
  }
}

function protectDepot(zone) {
  if (hasPhotonCannon(zone)) {
    protectedDepots.add(zone);
  } else {
    const plot = findPhotonCannonPlot(zone);

    if (plot) {
      job = new Build("PhotonCannon", plot);
      job.priority = 100;
    } else {
      // Don't look for plots for 10 seconds
      cooldown = Memory.Loop + 10 * 22.4;
    }
  }
}

function hasPhotonCannon(zone) {
  if (!zone.depot) return false;

  for (const one of zone.warriors) {
    if (one.type.name !== "PhotonCannon") continue;

    if (isCorrectDistance(one.body, zone.depot.body)) {
      return true;
    }
  }
}

function findPhotonCannonPlot(zone) {
  const center = zone.depot.body;
  const minx = Math.ceil(center.x - MAX_DISTANCE);
  const maxx = Math.floor(center.x + MAX_DISTANCE);
  const miny = Math.ceil(center.y - MAX_DISTANCE);
  const maxy = Math.floor(center.y + MAX_DISTANCE);

  for (let x = minx; x <= maxx; x++) {
    for (let y = miny; y <= maxy; y++) {
      const plot = { x, y };

      if (isInHarvestZone(zone, plot)) continue;
      if (!isCorrectDistance(center, plot)) continue;
      if (!Board.accepts(x, y, 2)) continue;
      if (!isInPsionicMatrix(zone, plot)) continue;
      if (isAroundObstacle(plot)) continue;

      return plot;
    }
  }
}

function isInHarvestZone(zone, pos) {
  if (!zone.depot || !zone.depot.harvestRally) return;

  const harvest = zone.depot.harvestRally;
  const dx = Math.abs(zone.depot.body.x - harvest.x);
  const dy = Math.abs(zone.depot.body.y - harvest.y);

  return (dx <= 5) && (dy <= 5);
}

function isCorrectDistance(a, b) {
  const sd = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);

  if (sd <= MAX_SQUARE_DISTANCE) {
    return true;
  }
}

function isInPsionicMatrix(zone, pos) {
  const radius = PSIONIC_MATRIX_RADIUS;

  for (const pylon of zone.buildings) {
    if (!pylon.type.isPylon) continue;
    if (!pylon.isActive) continue;

    const dx = pylon.body.x - pos.x;
    const dy = pylon.body.y - pos.y;

    if ((dx < -radius) || (dx > radius)) continue;
    if ((dy < -radius) || (dy > radius)) continue;

    if (dx * dx + dy * dy < radius * radius) {
      return true;
    }
  }
}

// TODO: Remove this once map sync updates the map with observed obstacles
function isAroundObstacle(pos) {
  for (const obstacle of Units.obstacles().values()) {
    const dx = Math.abs(obstacle.body.x - pos.x);
    const dy = Math.abs(obstacle.body.y - pos.y);

    if ((dx < 5) && (dy < 5)) {
      return true;
    }
  }
}
