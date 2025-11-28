import Mission from "../mission.js";
import Build from "../jobs/build.js";
import { ALERT_YELLOW } from "../map/alert.js";
import Board from "../map/board.js";
import Zone from "../map/zone.js";
import Resources from "../memo/resources.js";

const AVOID_LOOPS = 20 * 22.4; // 20 seconds

const avoid = new Map();

// Once minerals pile up, start building a pylon and a photon cannon in every zone
export default class SpendBankMission extends Mission {

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

    // Check if bank is not full yet
    if (Resources.supplyUsed < 195) return;
    if (Resources.minerals < 800) return;

    const zone = findZone();

    // Building photon cannons is the first priority
    const plotForCannon = findCannonPlot(zone);

    if (plotForCannon) {
      this.job = new Build("PhotonCannon", plotForCannon);
      this.job.priority = 50;
      return;
    }

    // Building pylons is the second priority
    const plotForPylon = findPylonPlot(zone);

    if (plotForPylon) {
      this.job = new Build("Pylon", plotForPylon);
      this.job.priority = 50;
    }
  }

}

function findZone() {
  let best = null;

  for (const zone of Zone.list()) {
    if (zone.isDepot) continue;
    if (zone.alertLevel > ALERT_YELLOW) continue;
    if (zone.buildings.size > 3) continue;
    if (shouldAvoidZone(zone)) continue;

    if (!best || (zone.permieterLevel < best.permieterLevel)) {
      best = zone;
    }
  }

  return best;
}

function findPylonPlot(zone) {
  if (!zone.isDepot && (zone.alertLevel <= ALERT_YELLOW) && !shouldAvoidZone(zone) && isPlotFree(zone.rally)) {
    return zone.rally;
  }
}

function findCannonPlot(zone) {
  if (!isZonePowered(zone)) return;

  const top = { x: zone.rally.x, y: zone.rally.y - 2 };

  if (isPlotFree(top)) return top;

  const bottom = { x: zone.rally.x, y: zone.rally.y + 2 };

  if (isPlotFree(bottom)) return bottom;
}

function isZonePowered(zone) {
  for (const building of zone.buildings) {
    if (building.type.isPylon && building.isAlive && building.isActive) return true;
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

  avoid.set(cell.zone, Resources.loop + AVOID_LOOPS);
}

function shouldAvoidZone(zone) {
  const avoidUntilLoop = avoid.get(zone);

  return (avoidUntilLoop && (Resources.loop < avoidUntilLoop));
}
