import Mission from "../mission.js";
import Units from "../units.js";
import Attack from "../jobs/attack.js";

// TODO: Remove the hack of closing a job when adding a defender after implementing jit-mining
import Job from "../job.js";

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
    jobs.set(jobId, new Attack({ type: { isWorker: true }, depot: nexus.depot }, nexus.depot.exitRally));

    // TODO: Remove this hack after implementing jit-mining
    for (const job of Job.list()) {
      if ((job.summary === "harvest") && job.assignee && (job.assignee.depot === nexus.depot)) {
        job.close(false);
        break;
      }
    }
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
