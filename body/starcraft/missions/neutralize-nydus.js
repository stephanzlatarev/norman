import Build from "../jobs/build.js";
import Map from "../map/map.js";
import Mission from "../mission.js";
import Resources from "../memo/resources.js";
import Units from "../units.js";
import { ActiveCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";

const WORM_DISSOLVE_LOOPS = 500;
const WORM_FORGET_LOOPS = 1500;

const canals = new Set();
const plots = new Set();
const jobs = new Set();

let lastNydusCanalVisibleCount;

export default class NeutralizeNydusMission extends Mission {

  run() {
    if (!ActiveCount.Forge) return;

    if (VisibleCount.NydusCanal !== lastNydusCanalVisibleCount) {
      updateCanalsList();

      lastNydusCanalVisibleCount = VisibleCount.NydusCanal;
    }

    if (canals.size) {
      for (const canal of canals) {
        monitorCanal(canal);
      }
    }

    if (plots.size) {
      for (const plot of plots) {
        monitorPlot(plot);
      }
    }

    if (jobs.size) {
      for (const job of jobs) {
        monitorJob(job);
      }
    }
  }

}

function updateCanalsList() {
  for (const unit of Units.enemies().values()) {
    if (unit.type.name === "NydusCanal") {
      canals.add(unit);
    }
  }
}

function monitorCanal(canal) {
  if (!canal.isAlive) {
    plots.add(canal);
    canals.delete(canal);
  }
}

function monitorPlot(plot) {
  if (Resources.loop - plot.lastSeen < WORM_DISSOLVE_LOOPS) return;

  if (Resources.loop - plot.lastSeen > WORM_FORGET_LOOPS) {
    plots.delete(plot);
    return;
  }

  if (Map.accepts(plot.zone, plot.body.x, plot.body.y, 2)) {
    const job = new Build("PhotonCannon", plot.body);
    job.priority = 100;
  
    jobs.add(job);
    plots.delete(plot);
  }
}

function monitorJob(job) {
  if (job.isDone || job.isFailed) {
    jobs.delete(job);
  }
}
