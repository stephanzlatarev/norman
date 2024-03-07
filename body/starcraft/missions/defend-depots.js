import Mission from "../mission.js";
import Units from "../units.js";
import Types from "../types.js";
import Attack from "../jobs/Attack.js";
import Count from "../memo/count.js";

// TODO: Remove the hack of closing a job when adding a defender after implementing jit-mining
import Job from "../job.js";

const Worker = Types.get("Worker");
const MaxAttackers = 12;

const jobs = new Map();

export default class DefendDepotsMission extends Mission {

  run() {
    if (Count.Zealot) {
      return closeAllJobs();
    }

    removeCompletedJobs();

    for (const nexus of Units.buildings().values()) {
      if (!nexus.depot) continue;
      if (!nexus.depot.workers.size) continue;

      const enemies = countEnemies(nexus.body);
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

function closeAllJobs() {
  if (jobs.size) {
    for (const job of jobs.values()) {
      job.close(true);
    }
  }

  jobs.clear();

  return true;
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
    jobs.set(jobId, new Attack({ type: Worker, depot: nexus.depot }, nexus.depot.exitRally));

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

function countEnemies(pos) {
  let count = 0;

  for (const enemy of Units.enemies().values()) {
    if (isCloseTo(enemy.body, pos)) {
      count++;
    }
  }

  return count;
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) <= 10) && (Math.abs(a.y - b.y) <= 10);
}
