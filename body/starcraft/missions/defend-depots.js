import Mission from "../mission.js";
import Units from "../units.js";
import Attack from "../jobs/attack.js";

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
    jobs.set(jobId, new Attack("Probe", nexus.depot, nexus.depot.exitRally));
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
