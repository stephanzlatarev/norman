import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Tiers from "../map/tier.js";
import { ActiveCount } from "../memo/count.js";

const PROXY_TIERS = 4;
const PROBE_ATTACKERS = 3;
const PYLON_ATTACKERS = 6;

const zones = new Set();
const jobs = new Set();

let nexus;

export default class NeutralizeProxiesMission extends Mission {

  run() {
    if (!nexus || !zones.size) findProxyZonesAndNexus();
    if (!zones.size) return;
    if (!jobs.size && (ActiveCount.Zealot || ActiveCount.Stalker)) return;

    if (jobs.size) removeCompletedJobs();

    const proxyProbeZone = getProxyWorkerZone();
    const proxyZone = proxyProbeZone || getProxyCannonZone();

    if (proxyZone) {
      const attackers = (proxyZone === proxyProbeZone) ? PROBE_ATTACKERS : PYLON_ATTACKERS;

      for (let i = jobs.size; i < attackers; i++) {
        jobs.add(new Neutralize(proxyZone));
      }
    } else if (jobs.size) {
      closeAllJobs();
    }
  }

}

class Neutralize extends Job {

  constructor(zone) {
    super("Probe");

    this.zone = zone;
    this.priority = 100;
  }

  execute() {
    const probe = this.assignee;
    const targets = this.zone.enemies;

    if (targets.size && ((probe.order.abilityId !== 23) || !probe.order.targetUnitTag || (probe.zone !== this.zone))) {
      // Target workers as first priority
      for (const target of targets) {
        if (target.isAlive && target.type.isWorker && (target.lastSeen === probe.lastSeen)) {
          new Order(probe, 23, target.body).accept(true);
          return;
        }
      }

      // Target pylons as second priority
      for (const target of targets) {
        if (target.isAlive && (target.type.name === "Pylon")) {
          new Order(probe, 23, target.body).accept(true);
          return;
        }
      }
    }

    if (probe.zone !== this.zone) {
      new Order(probe, 16, nexus.body).accept(true);
    }
  }

}

function findProxyZonesAndNexus() {
  if ((Tiers.length < PROXY_TIERS) || !Tiers[0].zones.size) return;

  if (!nexus) {
    for (const zone of Tiers[0].zones) {
      if (zone.depot) {
        nexus = zone.depot;
        break;
      }
    }
  }

  for (let i = 0; i < PROXY_TIERS; i++) {
    for (const zone of Tiers[i].zones) {
      zones.add(zone);
    }
    for (const zone of Tiers[i].fore) {
      if (zone.cells.size) {
        zones.add(zone);
      }
    }
  }
}

function getProxyWorkerZone() {
  for (const zone of zones) {
    for (const enemy of zone.enemies) {
      if (enemy.isAlive && (enemy.lastSeen === nexus.lastSeen) && enemy.type.isWorker && hasProxyPylon(zone)) return zone;
    }
  }
}

function getProxyCannonZone() {
  for (const zone of zones) {
    for (const enemy of zone.enemies) {
      if (enemy.isAlive && (enemy.lastSeen === nexus.lastSeen) && (enemy.type.name === "PhotonCannon") && hasProxyPylon(zone)) return zone;
    }
  }
}

function hasProxyPylon(zone) {
  for (const enemy of zone.enemies) {
    if (enemy.isAlive && (enemy.lastSeen === nexus.lastSeen) && (enemy.type.name === "Pylon")) return true;
  }
}

function removeCompletedJobs() {
  for (const job of jobs) {
    if (job.isDone || job.isFailed) {
      jobs.delete(job);
    }
  }
}

function closeAllJobs() {
  if (jobs.size) {
    for (const job of jobs) {
      job.close(true);
    }

    jobs.clear();
  }
}
