import { Depot, Job, Order } from "./imports.js";

const jobs = new Set();

export default function() {
  for (const zone of Depot.list()) {
    if (!zone.depot) continue;
    if (!zone.workers.size) continue;

    if (isUnderAttack(zone)) {
      openJobs(zone);
    } else {
      closeJobs(zone);
    }
  }
}

class Protect extends Job {

  constructor(zone, target) {
    super("Probe");

    this.zone = zone;
    this.target = target;
    this.priority = 100;
  }

  accepts(unit) {
    return (unit.zone === this.zone);
  }

  execute() {
    const worker = this.assignee;
    const target = this.target;

    if (worker.isCarryingHarvest) return;
    if (worker.order.abilityId === 299) return;
    if ((worker.order.abilityId === 298) && (worker.order.targetUnitTag === target.tag)) return;

    new Order(worker, 298, target).accept(true);
  }

}

function isUnderAttack(zone) {
  if (!zone.enemies.size) return false;

  return isUnderLiberatorAttack(zone);
}

function isUnderLiberatorAttack(zone) {
  if (!zone.effects.size) return false;

  let isLiberatorInDefendMode = false;

  for (const enemy of zone.enemies) {
    if (enemy.type.name === "LiberatorAG") {
      isLiberatorInDefendMode = true;
      break;
    }
  }

  return isLiberatorInDefendMode;
}

function countJobs(zone) {
  let count = 0;

  for (const job of jobs) {
    if (job.zone === zone) {
      count++;
    }
  }

  return count;
}

function openJobs(zone) {
  const neighbor = pickDepotZone(zone);
  if (!neighbor || !neighbor.minerals.size) return;

  const minerals = [...neighbor.minerals];

  for (const job of Job.list()) {
    if (jobs.has(job)) continue;
    if (job.zone !== zone) continue;

    if (job.assignee && job.assignee.type.isWorker) {
      job.isBusy = false;
    }
  }

  for (let i = countJobs(zone); i < zone.workers.size; i++) {
    const target = minerals[Math.floor(Math.random() * minerals.length)];

    jobs.add(new Protect(zone, target));
  }
}

function closeJobs(zone) {
  for (const job of jobs) {
    if (job.zone === zone) {
      job.close(true);
      jobs.delete(job);
    }
  }
}

function pickDepotZone(zone) {
  for (const one of Depot.list()) {
    if ((one !== zone) && one.isDepot && one.minerals.size) return one;
  }
}
