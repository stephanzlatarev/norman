import { Depot, Job, Order } from "./imports.js";

const MAX_WORKER_DEFENDERS = 12;
const MAX_WORKER_FLANKERS = 4;

const jobs = new Map();

export default function() {
  removeCompletedJobs();

  for (const zone of Depot.list()) {
    if (!zone.depot) continue;

    let defenders = 0;

    const targets = zone.enemies.size ? countTargets(zone.depot, zone.enemies) : 0;

    if ((targets > 0) && (zone.depot.isUnderAttack || isUnderAttack(zone))) {
      zone.depot.isUnderAttack = true;

      if (zone.warriors.size) {
        // There are military units in the zone, so we only support them with workers.
        defenders = Math.max(MAX_WORKER_FLANKERS - zone.warriors.size, 0);
      } else {
        // There are no military units in the zone, so we need to use workers to defend.
        defenders = targets * 3;
      }

      defenders = Math.min(defenders, zone.workers.size, MAX_WORKER_DEFENDERS);

      for (let i = 0; i < defenders; i++) {
        addJob(zone, i);
      }
    } else {
      zone.depot.isUnderAttack = false;
    }

    for (let i = defenders; i < MAX_WORKER_DEFENDERS; i++) {
      closeJob(zone, i);
    }
  }
}

class Defend extends Job {

  constructor(zone) {
    super("Probe");

    this.zone = zone;
    this.priority = 100;
  }

  accepts(unit) {
    return (unit.zone === this.zone) && (!unit.job || unit.job.isHarvestMineralsJob);
  }

  execute() {
    const probe = this.assignee;
    const targets = this.zone.enemies;

    if (targets.size && ((probe.order.abilityId !== 23) || !probe.order.targetUnitTag || (probe.zone !== this.zone))) {
      for (const target of targets) {
        if (target.isAlive && target.body.isGround && (target.lastSeen === probe.lastSeen)) {
          new Order(probe, 23, target.body).accept(true);
          break;
        }
      }
    }
  }

}

function countTargets(depot, enemies) {
  let count = 0;

  for (const enemy of enemies) {
    if (enemy.isAlive && enemy.body.isGround && (enemy.lastSeen === depot.lastSeen)) count++;
  }

  return count;
}

function isUnderAttack(zone) {
  for (const worker of zone.workers) {
    if (worker.isHit) return true;
  }
  for (const building of zone.buildings) {
    if (building.isHit) return true;
  }
}

function removeCompletedJobs() {
  for (const [jobId, job] of jobs) {
    if (job.isDone || job.isFailed) {
      jobs.delete(jobId);
    }
  }
}

function addJob(zone, index) {
  const jobId = zone.cell.id + ":" + index;

  if (!jobs.has(jobId)) {
    jobs.set(jobId, new Defend(zone));
  }
}

function closeJob(zone, index) {
  const jobId = zone.cell.id + ":" + index;
  const job = jobs.get(jobId);

  if (job) {
    job.close(true);
    jobs.delete(jobId);
  }
}
