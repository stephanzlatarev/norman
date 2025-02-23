import Board from "../map/board.js";
import Build from "../jobs/build.js";
import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Resources from "../memo/resources.js";
import Units from "../units.js";
import { ActiveCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";

const WORM_DISSOLVE_LOOPS = 500;
const WORM_FORGET_LOOPS = 1500;

const canals = new Set();
const plots = new Set();
const jobs = new Set();
const army = new Map();

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

class NeutralizeWorm extends Job {

  constructor(type, plot) {
    super(type);

    this.zone = plot.zone;
    this.priority = 100;
    this.isCommitted = true;
    this.location = plot.body;
  }

  execute() {
    const warrior = this.assignee;

    if (!warrior || !warrior.isAlive) return;
    if (isClose(warrior.body, this.location, 6)) return;
    
    Order.move(warrior, this.location);
  }

}

function updateCanalsList() {
  for (const unit of Units.enemies().values()) {
    if (unit.type.name === "NydusCanal") {
      canals.add(unit);
      army.set(unit, [
        new NeutralizeWorm("Observer", unit),
        new NeutralizeWorm("Stalker", unit), new NeutralizeWorm("Stalker", unit),
        new NeutralizeWorm("Zealot", unit), new NeutralizeWorm("Zealot", unit),
      ]);
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

  if (isPlotClear(plot.body.x, plot.body.y, 2)) {
    const job = new Build("PhotonCannon", plot.body);
    job.priority = 100;

    jobs.add(job);
    army.set(job, army.get(plot));
    plots.delete(plot);
    army.delete(plot);
  }
}

function isPlotClear(x, y) {
  return !Board.cell(x, y).isObstacle && !Board.cell(x + 1, y).isObstacle && !Board.cell(x, y + 1).isObstacle && !Board.cell(x + 1, y + 1).isObstacle;
}

function monitorJob(job) {
  if (job.isDone || job.isFailed) {
    const warriors = army.get(job);

    if (warriors) {
      for (const warrior of warriors) {
        warrior.close(true);
      }
    }

    jobs.delete(job);
    army.delete(job);
  }
}

function isClose(a, b, span) {
  return (Math.abs(a.x - b.x) <= span) && (Math.abs(a.y - b.y) <= span);
}
