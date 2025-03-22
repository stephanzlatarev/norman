import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Tiers from "../map/tier.js";
import { ActiveCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";

const PROXY_TIERS = 4;
const PROBE_ATTACKERS = 3;
const PYLON_ATTACKERS = 6;

const zones = new Set();
const jobs = new Set();

let nexus;
let isMissionComplete;
let hasEnemyForge;
let hasEnemyProxy;

export default class NeutralizeProxiesMission extends Mission {

  run() {
    if (isMissionComplete) return;
    if (!nexus || !zones.size) findProxyZonesAndNexus();
    if (!zones.size) return;

    if (ActiveCount.Zealot + ActiveCount.Stalker > 2) {
      isMissionComplete = true;
      return;
    }

    if (VisibleCount.Forge) hasEnemyForge = true;

    if (jobs.size) removeCompletedJobs();

    const proxyProbeZone = getProxyWorkerZone();
    const proxyZone = proxyProbeZone || getProxyCannonZone();

    hasEnemyProxy = !!proxyZone;

    if (hasEnemyProxy) {
      const attackers = (proxyZone === proxyProbeZone) ? PROBE_ATTACKERS : PYLON_ATTACKERS;

      for (let i = jobs.size; i < attackers; i++) {
        jobs.add(new Neutralize(proxyZone));
      }
    } else if (hasEnemyForge) {
      if (!jobs.size) jobs.add(new Patrol());
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
  
  distance(unit) {
    return calculateSquareDistance(unit.body, this.zone);
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
    } else if (!probe.order.abilityId && this.zone.threats.size) {
      const target = this.zone.threats.values().next().value;

      if (isSamePosition(probe.body, target.body) && !targets.has(target)) {
        this.zone.threats.delete(target);
      } else {
        Order.move(probe, target.body);
      }
    }
  }

}

class Patrol extends Job {

  route = [];

  constructor() {
    super("Probe");

    this.zone = nexus.zone;
    this.priority = 100;
  }

  execute() {    
    if (isMissionComplete) return this.close(true);
    if (hasEnemyProxy) return this.close(true);

    const scout = this.assignee;

    let zone = this.getNextZone();

    if (isSamePosition(scout.body, zone)) {
      this.route.length = this.route.length - 1;

      zone = this.getNextZone();
    }

    Order.move(scout, zone);
  }

  getNextZone() {
    if (!this.route.length) {
      for (const zone of zones) {
        if (!zone.buildings.size) {
          this.route.push(zone);
        }
      }

      if (!this.route.length) {
        this.route = [...zones];
      }
    }

    return this.route[this.route.length - 1];
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
  }
}

function getProxyWorkerZone() {
  for (const zone of zones) {
    for (const enemy of zone.threats) {
      if (enemy.type.isWorker && hasProxyPylon(zone)) return zone;
    }
  }
}

function getProxyCannonZone() {
  for (const zone of zones) {
    for (const enemy of zone.threats) {
      if ((enemy.type.name === "PhotonCannon") && hasProxyPylon(zone)) return zone;
    }
  }
}

function hasProxyPylon(zone) {
  for (const enemy of zone.threats) {
    if (enemy.type.name === "Pylon") return true;
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

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 3) && (Math.abs(a.y - b.y) < 3);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
