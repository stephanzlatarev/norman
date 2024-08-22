import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";

const MaxAttackers = 12;

const jobs = new Map();

export default class DefendDepotsMission extends Mission {

  run() {
    removeCompletedJobs();

    for (const nexus of Units.buildings().values()) {
      if (!nexus.depot) continue;
      if (!nexus.depot.workers.size) continue;

      const enemies = nexus.depot.enemies.size;
      let defenders = 0;

      if (enemies > 0) {
        defenders = Math.min(enemies * 3, nexus.depot.workers.size, MaxAttackers);

        for (let i = 0; i < defenders; i++) {
          addJob(nexus, i);
        }
      }
  
      for (let i = defenders; i < MaxAttackers; i++) {
        closeJob(nexus, i);
      }
    }
  }

}

class Defend extends Job {

  constructor(nexus) {
    super("Probe");

    this.zone = nexus.depot;
    this.priority = 100;
  }

  accepts(unit) {
    return (unit.zone === this.zone);
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

function addJob(nexus, index) {
  const jobId = nexus.tag + ":" + index;

  if (!jobs.has(jobId)) {
    jobs.set(jobId, new Defend(nexus));
  }
}

function closeJob(nexus, index) {
  const jobId = nexus.tag + ":" + index;
  const job = jobs.get(jobId);

  if (job) {
    job.close(true);
    jobs.delete(jobId);
  }
}
