import Mission from "../mission.js";
import Order from "../order.js";
import Build from "../jobs/build.js";
import { ALERT_WHITE } from "../map/alert.js";
import Depot from "../map/depot.js";
import GameMap from "../map/map.js";
import { TotalCount } from "../memo/count.js";
import Plan from "../memo/plan.js";
import Priority from "../memo/priority.js";
import Resources from "../memo/resources.js";

const COOLDOWN_LOOPS = 500;

const cooldown = new Map();

export default class BuildExpansionsMission extends Mission {

  job;
  retreat;

  run() {
    if (this.job) {
      if (shouldNotBuildNexus()) {
        return this.job.close(true);
      } else if (this.job.target.alertLevel > ALERT_WHITE) {
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

  cooldown.set(job.target, Resources.loop);

  console.log("Job", job.details, "aborted. Target zone alert level:", job.target.alertLevel);
  job.abort(false);

  if (probe && retreat) {
    new Order(probe, (retreat.type && retreat.type.isMinerals) ? 298 : 16, retreat);
  }
}

function shouldNotBuildNexus() {
  return (Plan.BaseLimit && (TotalCount.Nexus >= Plan.BaseLimit));
}

function findDepot() {
  const traversed = new Set();
  let wave = new Set();

  wave.add(Depot.home);
  traversed.add(Depot.home);

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
      if (zone.isDepot && !isZoneThreatened(zone) && GameMap.accepts(zone.x, zone.y, 5)) {
        const lastAttempt = cooldown.get(zone);

        if (!lastAttempt || (Resources.loop - lastAttempt >= COOLDOWN_LOOPS)) {
          return zone;
        }
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
