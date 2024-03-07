import Mission from "../mission.js";
import Units from "../units.js";
import WorkerHarvest from "../jobs/WorkerHarvest.js";
import WorkerTransfer from "../jobs/WorkerTransfer.js";

//TODO: When mission is converted to skill, there will be just one job per mineral patch of active depot at a time
const jobs = new Map();
const transfers = new Set();

export default class MineMineralsMission extends Mission {

  run() {
    removeCompletedJobs();

    for (const nexus of Units.buildings().values()) {
      if (!nexus.depot) continue;
      if (!nexus.depot.minerals) continue;
      if (!nexus.depot.workers) continue;

      const capacity = nexus.depot.minerals.length * 2;
      const workerCount = nexus.depot.workers.size;

      // Create at most two jobs per mineral patch as this is optimal without just-in-time mining but not more than the number of workers at the depot
      let jobCount = 0;
      let jobIndex = 0;

      if (nexus.isActive) {
        for (const minerals of nexus.depot.minerals) {
          for (let n = 1; (n <= 2) && (jobCount < workerCount); n++, jobIndex++, jobCount++) {
            createHarvestJob(nexus.tag + ":" + jobIndex, minerals, nexus.depot);
          }
        }
      }

      nexus.depot.isSaturated = (workerCount >= capacity);

      // Transfer extra workers
      let extraCount = workerCount - capacity;

      for (const transferJob of transfers) {
        if (transferJob.isDone || transferJob.isFailed) {
          transfers.delete(transferJob);
        } else {
          extraCount--;
        }
      }

      for (let i = 0; i < extraCount; i++) {
        const target = findTransferDepot();

        if (target) {
          transfers.add(new WorkerTransfer(nexus.depot, target));
        } else {
          break;
        }
      }
    }
  }

}

function removeCompletedJobs() {
  for (const [tag, job] of jobs) {
    if (job.isDone || job.isFailed) {
      jobs.delete(tag);
    }
  }
}

function createHarvestJob(jobId, minerals, depot) {
  let job = jobs.get(jobId);

  if (!job) {
    job = new WorkerHarvest(minerals, depot);

    jobs.set(jobId, job);
  }
}

function findTransferDepot() {
  for (const one of Units.buildings().values()) {
    if (one.depot && !one.depot.isSaturated) {
      return one.depot;
    }
  }
}
