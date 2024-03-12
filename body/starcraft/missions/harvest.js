import Mission from "../mission.js";
import Units from "../units.js";
import Harvest from "../jobs/harvest.js";
import Transfer from "../jobs/transfer.js";

//TODO: When mission is converted to skill, there will be just one job per mineral patch of active depot at a time
const jobs = new Map();
const transfers = new Set();

const MAX_HARVEST_JOBS = 22;

// Create at most two jobs per mineral patch as this is optimal without just-in-time mining
// but not more than the number of workers at the depot.
// Create three jobs per active extractor.
export default class HarvestMission extends Mission {

  run() {
    removeCompletedJobs();

    for (const nexus of Units.buildings().values()) {
      const depot = nexus.depot;

      if (!depot) continue;
      if (!depot.minerals) continue;
      if (!depot.vespene) continue;
      if (!depot.workers) continue;

      const workerCount = depot.workers.size;

      let capacity = 0;
      let jobCount = 0;
      let jobIndex = 0;

      if (nexus.isActive) {
        for (const minerals of depot.minerals) {
          capacity += 2;

          for (let i = 1; i <= 2; i++) {
            if ((jobCount < workerCount) && (jobIndex < MAX_HARVEST_JOBS)) {
              createHarvestJob(jobIndex, nexus, minerals);
              jobCount++;
              jobIndex++;
            }
          }
        }

        for (const vespene of depot.vespene) {
          if (!vespene.extractor || !vespene.extractor.isActive) continue;

          capacity += 3;

          for (let i = 1; i <= 3; i++) {
            if ((jobCount < workerCount) && (jobIndex < MAX_HARVEST_JOBS)) {
              createHarvestJob(jobIndex, nexus, vespene.extractor);
              jobCount++;
              jobIndex++;
            }
          }
        }
      }

      depot.isSaturated = (workerCount >= capacity);

      // Close extra jobs
      for (; jobIndex < MAX_HARVEST_JOBS; jobIndex++) {
        closeHarvestJob(jobIndex, nexus);
      }

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
          transfers.add(new Transfer(depot, target));
        } else {
          break;
        }
      }
    }
  }

}

function removeCompletedJobs() {
  for (const [id, job] of jobs) {
    if (job.isDone || job.isFailed) {
      jobs.delete(id);
    }
  }
}

function createHarvestJob(index, nexus, resource) {
  const jobId = nexus.tag + ":" + index;

  let job = jobs.get(jobId);

  if (!job) {
    job = new Harvest(resource, nexus.depot);

    jobs.set(jobId, job);
  }
}

function closeHarvestJob(index, nexus) {
  const jobId = nexus.tag + ":" + index;

  let job = jobs.get(jobId);

  if (job) {
    job.close(true);
    jobs.delete(jobId);
  }
}

function findTransferDepot() {
  for (const one of Units.buildings().values()) {
    if (one.depot && !one.depot.isSaturated) {
      return one.depot;
    }
  }
}
