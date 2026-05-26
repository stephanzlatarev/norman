import { Board, Build, Depot, Memory, VisibleCount, info } from "../imports.js";

const TIME_WINDOW = 6 * 60 * 22.4; // 6 minutes
const PSIONIC_MATRIX_RADIUS = 6.5;

const MIN_DISTANCE = 1.125 + 6 + 1.25 + 0.1;
const MAX_DISTANCE = 1.125 + 7 + 1.25 - 0.1;
const MIN_SQUARE_DISTANCE = MIN_DISTANCE * MIN_DISTANCE;
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
    if (job.isFailed) {
      job = null;
    } else if (!job.isDone) {
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

      if (isCorrectDistance(center, plot) && Board.accepts(x, y, 2) && isInPsionicMatrix(zone, plot)) {
        return plot;
      }
    }
  }
}

function isCorrectDistance(a, b) {
  const sd = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);

  if ((sd >= MIN_SQUARE_DISTANCE) && (sd <= MAX_SQUARE_DISTANCE)) {
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
