import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Tiers from "../map/tier.js";
import { ActiveCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";

const PROXY_TIERS = 4;
const WORKER_ATTACKERS = 3;
const PYLON_ATTACKERS = 6;

const zones = new Set();
const jobs = new Set();

let home;
let proxy;
let forge;
let isMissionComplete;

export default class NeutralizeProxiesMission extends Mission {

  run() {
    if (isMissionComplete) return;
    if (!home || !zones.size) findHomeAndProxyZones();
    if (!zones.size) return;

    if (ActiveCount.Zealot + ActiveCount.Stalker > 2) {
      isMissionComplete = true;
      return;
    }

    if (VisibleCount.Forge) forge = true;

    if (jobs.size) removeCompletedJobs();

    proxy = findProxy();

    if (proxy) {
      if (proxy.attackers === Infinity) {
        // The proxy is active and defended and cannot be neutralized with workers only
        closeAllJobs();

        isMissionComplete = true;
      } else if (proxy.attackers > ActiveCount.Probe) {
        // Too many workers are needed to neutralize the proxy
        closeAllJobs();
      } else {
        // The proxy can be neutralized with workers
        for (let i = jobs.size; i < proxy.attackers; i++) {
          jobs.add(new Neutralize());
        }
      }
    } else if (forge) {
      if (!jobs.size) jobs.add(new Patrol());
    } else if (jobs.size) {
      closeAllJobs();
    }
  }

}

class Proxy {

  constructor(zone, attackers) {
    this.zone = zone;
    this.attackers = attackers;
  }

}

class Neutralize extends Job {

  constructor() {
    super("Probe");

    this.zone = proxy.zone;
    this.priority = 100;
  }
  
  distance(unit) {
    return calculateSquareDistance(unit.body, this.zone);
  }

  execute() {
    const probe = this.assignee;
    const targets = this.zone.enemies;

    // If already attacking a valid target continue with the attack
    if (isAttackingValidTarget(probe)) return;

    // If outside of the proxy zone move to it
    if (probe.zone !== this.zone) return Order.move(probe, this.zone);

    // Target workers as first priority
    for (const target of targets) {
      if (target.type.isWorker && target.isAlive && (target.lastSeen === probe.lastSeen)) {
        return Order.attack(probe, target);
      }
    }

    // Target pylons as second priority
    for (const target of targets) {
      if (target.type.isPylon && target.isAlive && (target.lastSeen === probe.lastSeen)) {
        return Order.attack(probe, target);
      }
    }

    // If no workers and pylons are in sight, move to the closest target in fog of war
    for (const target of this.zone.threats) {
      if (!target.type.isWorker && !target.type.isPylon) continue;
      if (targets.has(target)) continue;

      if (isSamePosition(probe.body, target.body)) {
        this.zone.threats.delete(target);
      } else {
        return Order.move(probe, target.body);
      }
    }

    // Otherwise, we're done
    Order.move(probe, home);
    this.close(true);
  }

}

class Patrol extends Job {

  route = [];

  constructor() {
    super("Probe");

    this.zone = home;
    this.priority = 100;
  }

  execute() {    
    if (isMissionComplete) return this.close(true);
    if (proxy) return this.close(true);

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

function findHomeAndProxyZones() {
  if ((Tiers.length < PROXY_TIERS) || !Tiers[0].zones.size) return;

  for (let i = 0; i < PROXY_TIERS; i++) {
    for (const zone of Tiers[i].zones) {
      zones.add(zone);

      if (!home && zone.depot) {
        home = zone;
      }
    }
  }
}

function findProxy() {
  for (const zone of zones) {
    const proxy = findProxyInZone(zone);

    if (proxy) return proxy;
  }
}

function findProxyInZone(zone) {
  let hasBuilding = false;
  let hasPylon = false;
  let hasWorker = false;

  for (const enemy of zone.threats) {
    if (enemy.type.isWorker) {
      hasWorker = true;
    } else if (enemy.type.isWarrior && enemy.isActive) {
      return new Proxy(zone, Infinity);
    } else if (enemy.type.isBuilding) {
      hasBuilding = true;
      hasPylon |= enemy.type.isPylon;
    }
  }

  if (hasWorker && hasBuilding) {
    return new Proxy(zone, WORKER_ATTACKERS);
  } else if (hasPylon && hasBuilding) {
    return new Proxy(zone, PYLON_ATTACKERS);
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

function isAttackingValidTarget(probe) {
  if (probe.order.abilityId !== 23) return false;
  if (!probe.order.targetUnitTag) return false;

  let hasWorkers = false;
  let isAttackingPylon = false;

  for (const enemy of proxy.zone.enemies) {
    if (enemy.type.isWorker) hasWorkers = true;
    if (probe.order.targetUnitTag !== enemy.tag) continue;

    if (enemy.type.isWorker) return true;
    if (enemy.type.isPylon) isAttackingPylon = true;
  }

  return isAttackingPylon && !hasWorkers;
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 3) && (Math.abs(a.y - b.y) < 3);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
