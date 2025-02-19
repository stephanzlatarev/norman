import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import { ALERT_WHITE } from "../map/alert.js";
import GameMap from "../map/map.js";
import { TotalCount } from "../memo/count.js";
import Plan from "../memo/plan.js";
import Priority from "../memo/priority.js";
import Resources from "../memo/resources.js";

const COOLDOWN_LOOPS = 500;

const cooldown = new Map();

export default class BuildExpansionsMission extends Mission {

  home;
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

    if (shouldNotBuildNexus()) return;

    if (!this.home) {
      this.home = locateHomeZone();
    }

    const depot = findDepot(this.home);

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

function locateHomeZone() {
  return Units.buildings().values().next().value.zone;
}

function findDepot(home) {
  const checked = new Set();
  const next = new Set();

  next.add(home);

  for (const zone of next) {
    if (zone.isDepot && (zone.alertLevel <= ALERT_WHITE) && GameMap.accepts(zone.x, zone.y, 5)) {
      if (zone === home) {
        // Map is not analyzed yet
        return;
      }

      const lastAttempt = cooldown.get(zone);

      if (!lastAttempt || (Resources.loop - lastAttempt >= COOLDOWN_LOOPS)) {
        return zone;
      }
    }

    checked.add(zone);

    for (const one of getNeighborZones(zone)) {
      if (!checked.has(one)) {
        next.add(one);
      }
    }

    next.delete(zone);
  }
}

function getNeighborZones(zone) {
  const zones = new Set();

  for (const corridor of zone.corridors) {
    for (const one of corridor.zones) {
      if (one !== zone) {
        zones.add(one);
      }
    }
  }

  return zones;
}
