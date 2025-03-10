import Mission from "../mission.js";
import Order from "../order.js";
import Build from "../jobs/build.js";
import { ALERT_WHITE, ALERT_YELLOW } from "../map/alert.js";
import Board from "../map/board.js";
import Depot from "../map/depot.js";
import { TotalCount } from "../memo/count.js";
import Plan from "../memo/plan.js";
import Priority from "../memo/priority.js";
import Resources from "../memo/resources.js";

const AVOID_LOOPS = 20 * 22.4; // 20 seconds
const MIN_SUPPLY = 5;

const avoid = new Map();

export default class BuildExpansionsMission extends Mission {

  job;
  retreat;

  run() {
    if (this.job) {
      if (shouldNotBuildNexus()) {
        return this.job.close(true);
      } else if (this.job.target.alertLevel > ALERT_YELLOW) {
        // Abort the job if the target zone is threatened
        this.job = abortBuildJob(this.job, this.retreat);
      } else if ((this.job.target.alertLevel > ALERT_WHITE) && (Resources.supply >= MIN_SUPPLY)) {
        // Abort the job if there is still supply for more warriors and the target zone is not secure
        this.job = abortBuildJob(this.job, this.retreat);
      } else if (this.job.isFailed) {
        this.job = abortBuildJob(this.job, this.retreat);
      } else if (!this.job.isDone) {
        // Make sure the job is of the right priority
        this.job.priority = Priority.Nexus;

        if (this.job.assignee && !this.retreat) {
          this.retreat = selectRetreat(this.job.assignee);
        }

        // Continue with the same job
        return;
      }
    }

    if (!Depot.home) return;
    if (shouldNotBuildNexus()) return;

    const depot = findDepot();

    if (depot) {
      this.job = new Build("Nexus", depot);
      this.retreat = null;
    }
  }

}

function selectRetreat(probe) {
  if (!probe || !probe.zone) return;

  if (probe.zone.isDepot) {
    return [...probe.zone.minerals][0];
  } else {
    return { x: probe.x, y: probe.y };
  }
}

function abortBuildJob(job, retreat) {
  const probe = job.assignee;

  avoidZone(job);

  console.log("Job", job.details, "aborted. Target zone alert level:", job.target.alertLevel);
  job.abort(false);

  if (probe && retreat) {
    new Order(probe, (retreat.type && retreat.type.isMinerals) ? 298 : 16, retreat);
  }
}

function shouldNotBuildNexus() {
  if (Plan.BaseLimit) {
    if (Resources.supply < MIN_SUPPLY) {
      // Supply for new warriors is running out. So attempt an expansion even if over the limit.
      return false;
    }

    return (TotalCount.Nexus >= Plan.BaseLimit);
  }
}

function findDepot() {
  const traversed = new Set();
  let wave = new Set();

  wave.add(Depot.home);
  traversed.add(Depot.home);

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
      if (zone.isDepot && !shouldAvoidZone(zone) && !isZoneThreatened(zone) && Board.accepts(zone.x, zone.y, 5)) {
        return zone;
      }

      for (const neighbor of zone.neighbors) {
        if (!traversed.has(neighbor)) {
          next.add(neighbor);
          traversed.add(neighbor);
        }
      }
    }

    wave = next;
  }
}

function isZoneThreatened(zone) {
  if (zone.alertLevel <= ALERT_WHITE) return false;

  for (const enemy of zone.enemies) {
    if (enemy.type.isWarrior && !enemy.type.isWorker) return true;
  }
}

function avoidZone(job) {
  if (!job || !job.target) return;

  avoid.set(job.target, Resources.loop + AVOID_LOOPS);
}

function shouldAvoidZone(zone) {
  const avoidUntilLoop = avoid.get(zone);

  return (avoidUntilLoop && (Resources.loop < avoidUntilLoop));
}
