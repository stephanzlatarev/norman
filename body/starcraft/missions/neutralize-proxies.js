import Memory from "../../../code/memory.js";
import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Tiers from "../map/tier.js";
import { ActiveCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";

const PROXY_TIERS = 4;
const CANNON_ATTACKERS = 6;
const NEXUS_ATTACKERS = 12;
const PYLON_ATTACKERS = 6;
const WORKER_ATTACKERS_MANY = 3;
const WORKER_ATTACKERS_ONE = 1;

const PROXY_NEXUS_PROGRESS_THRESHOLD = 0.53;

const TYPE_CANNON = "PhotonCannon";
const TYPE_NEXUS = "Nexus";

const zones = new Set();
const neutralizeJobs = new Set();
let patrolJob = null;

let home;
let proxy;
let forge;
let isMissionComplete;

// TODO: Now that we wall the home base, change the mission to neutralize proxy only when behind the wall
export default class NeutralizeProxiesMission extends Mission {

  run() {
    if (isMissionComplete) return;
    if (!home || !zones.size) findHomeAndProxyZones();
    if (!zones.size) return;

    if (!Memory.FlagEnemyProxyNexus && (ActiveCount.Zealot + ActiveCount.Stalker > 2)) {
      isMissionComplete = true;
      return;
    }

    if (VisibleCount.Forge) forge = true;

    if (neutralizeJobs.size || patrolJob) removeCompletedJobs();

    proxy = findProxy();

    if (proxy) {
      Memory.FlagEnemyProxyNexus = (proxy.isHome && proxy.nexuses.length);

      if (Memory.FlagEnemyProxyNexus) {
        // When enemy uses a proxy nexus in our base then they intend to recall probes and zealots to it
        const proxyNexus = proxy.nexuses[0];

        // Wait until the time when our workers will kill the nexus just before it completes to block the enemy resources and buy time
        if (proxyNexus.buildProgress >= PROXY_NEXUS_PROGRESS_THRESHOLD) {
          openNeutralizeJobs(100, proxy.nexuses, NEXUS_ATTACKERS, home);
        }
      } else if (proxy.isHome) {
        // When the proxy is in our base then we should attempt to neutralize it at all cost
        openNeutralizeJobs(100, proxy.workers, WORKER_ATTACKERS_MANY, home);
        openNeutralizeJobs(99, proxy.pylons, PYLON_ATTACKERS, home);
        openNeutralizeJobs(98, proxy.cannons, CANNON_ATTACKERS, home);
      } else if (!proxy.warriors.length) {
        // When the proxy is not defended yet then attack any workers. Don't stop harvest to destroy the structures
        openNeutralizeJobs(100, proxy.workers, WORKER_ATTACKERS_ONE);
      } else {
        // The proxy is defended and cannot be neutralized with workers only
        closeAllNeutralizeJobs();
        closePatrolJob();

        isMissionComplete = true;
      }

    } else {
      Memory.FlagEnemyProxyNexus = false;
      closeAllNeutralizeJobs();

      if (forge && !patrolJob) {
        patrolJob = new Patrol();
      }
    }
  }

}

class Proxy {

  constructor(isHome, workers, pylons, cannons, nexuses, warriors) {
    this.isHome = isHome;
    this.workers = workers;
    this.pylons = pylons;
    this.cannons = cannons;
    this.nexuses = nexuses;
    this.warriors = warriors;
  }

}

class Neutralize extends Job {

  constructor(target, priority) {
    super("Probe", null, target);

    this.zone = home;
    this.target = target;
    this.priority = priority;
  }
  
  distance(unit) {
    return calculateSquareDistance(unit.body, this.zone);
  }

  execute() {
    const probe = this.assignee;
    const target = this.target;

    if (!target.isAlive || (target.lastSeen !== probe.lastSeen)) {
      if (isSamePosition(probe.body, target.body)) {
        target.zone.threats.delete(target);

        if (probe.zone === home) {
          return this.close(true);
        } else {
          return Order.move(probe, home);
        }
      } else {
        return Order.move(probe, target.body);
      }
    }

    Order.attack(probe, target);
  }

  close(outcome) {
    super.close(outcome);

    Order.move(this.assignee, home);
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

  close(outcome) {
    super.close(outcome);

    Order.move(this.assignee, home);
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
  let isHome = false;
  const buildings = [];
  const cannons = [];
  const nexuses = [];
  const pylons = [];
  const warriors = [];
  const workers = [];

  for (const zone of zones) {
    for (const enemy of zone.threats) {
      if (zone === home) isHome = true;

      if (enemy.type.isWorker) {
        workers.push(enemy);
      } else if (enemy.type.isWarrior && enemy.isActive) {
        warriors.push(enemy);

        if (enemy.type.name === TYPE_CANNON) cannons.push(enemy);
      } else if (enemy.type.isPylon) {
        pylons.push(enemy);
      } else if (enemy.type.isBuilding) {
        buildings.push(enemy);

        if (enemy.type.name === TYPE_CANNON) cannons.push(enemy);
        if (enemy.type.name === TYPE_NEXUS) nexuses.push(enemy);
      }
    }
  }

  if (
    (isHome && nexuses.length) ||                  // Enemy nexus in our home base
    (workers.length && pylons.length) ||           // Probe builds a pylon
    (workers.length && buildings.length) ||        // SCV builds a bunker, or probe builds a gateway
    (pylons.length && cannons.length) ||           // Pylon powers a cannon
    (pylons.length && buildings.length) ||         // Pylon powers a gateway
    (proxy && (cannons.length || warriors.length)) // Remember proxy when cannons are still not neutralized
  ) {
    return new Proxy(isHome, workers, pylons, cannons, nexuses, warriors);
  }
}


function openNeutralizeJobs(priority, targets, count, zone) {
  for (const target of targets) {
    openNeutralizeJobsForTarget(priority, target, (!zone || (target.zone === zone)) ? count : 0);
  }
}

function openNeutralizeJobsForTarget(priority, target, count) {
  let active = 0;

  for (const job of neutralizeJobs) {
    if (job.target === target) {
      if (active >= count) {
        job.close(true);
        neutralizeJobs.delete(job);
      } else {
        active++;
      }
    }
  }

  for (; active < count; active++) {
    neutralizeJobs.add(new Neutralize(target, priority));
  }
}

function removeCompletedJobs() {
  for (const job of neutralizeJobs) {
    if (job.isDone || job.isFailed) {
      neutralizeJobs.delete(job);
    }
  }

  if (patrolJob && (patrolJob.isDone || patrolJob.isFailed)) {
    patrolJob = null;
  }
}

function closeAllNeutralizeJobs() {
  if (neutralizeJobs.size) {
    for (const job of neutralizeJobs) {
      job.close(true);
    }

    neutralizeJobs.clear();
  }
}

function closePatrolJob() {
  if (patrolJob) {
    patrolJob.close(true);
    patrolJob = null;
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 3) && (Math.abs(a.y - b.y) < 3);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
