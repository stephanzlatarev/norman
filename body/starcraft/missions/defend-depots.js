import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Depot from "../map/depot.js";

const MAX_ATTACKERS = 12;

const jobs = new Map();

export default class DefendDepotsMission extends Mission {

  run() {
    removeCompletedJobs();

    for (const zone of Depot.list()) {
      if (!zone.workers.size) continue;

      const enemies = zone.enemies.size;
      let defenders = 0;

      if (enemies > 0) {
        defenders = Math.min(enemies * 3, zone.workers.size, MAX_ATTACKERS);

        for (let i = 0; i < defenders; i++) {
          addJob(zone, i);
        }
      }
  
      for (let i = defenders; i < MAX_ATTACKERS; i++) {
        closeJob(zone, i);
      }
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
    return (unit.zone === this.zone) && (!unit.job || unit.isHarvestMineralsJob);
  }

  execute() {
    const probe = this.assignee;
    const targets = this.zone.enemies;

    if (targets.size && (probe.order.abilityId !== 23)) {
      new Order(probe, 23, [...targets][0].body).accept(true);
    }
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
