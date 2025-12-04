import { Board, Build, Memory, Zone } from "./imports.js";

const ALERT_YELLOW = 4;
const PERIMETER_WHITE = 3;

let cooldown = 0;
let job = null;

// Add vision to all zones in our perimeter
export default function() {
  if (job) {
    if (job.isFailed) {
      job = null;
    } else if (!isZoneValid(job.target.zone)) {
      job.close(false);
      job = null;
    } else if (!job.isDone) {
      return;
    }
  }

  if (Memory.Loop < cooldown) return;

  const plot = findPlot();

  if (plot) {
    job = new Build("Pylon", plot);
    job.priority = 50;
  } else {
    // Don't look for pylon plots for 10 seconds
    cooldown = Memory.Loop + 10 * 22.4;
  }
}

function isZoneValid(zone) {
  if (zone.isDepot) return false;
  if (zone.buildings.size) return false;

  if (!zone.perimeterLevel) return false;
  if (zone.perimeterLevel > PERIMETER_WHITE) return false;

  if (!zone.alertLevel) return false;
  if (zone.alertLevel > ALERT_YELLOW) return false;

  if (!isPlotFree(zone.rally)) return false;

  return true;
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

function findPlot() {
  let best = null;

  for (const zone of Zone.list()) {
    if (!isZoneValid(zone)) continue;

    if (!best || (zone.perimeterLevel < best.perimeterLevel)) {
      best = zone;
    }
  }

  if (best) return best.rally;
}
