import Mission from "../mission.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";
import Produce from "../jobs/produce.js";
import Limit from "../memo/limit.js";

// TODO: When mission is converted to skill, there will be one instance per active nexus and just one job at a time
const jobs = new Map();

export default class BuildWorkersMission extends Mission {

  run() {
    removeCompletedJobs();

    if (Units.workers().size >= Limit.Worker) return;

    for (const nexus of Units.buildings().values()) {
      if (nexus.job) continue;
      if (!nexus.depot) continue;
      if (!nexus.isActive) continue;
      if (setRallyPoint(nexus)) continue;

      createBuildWorkerJob(nexus);
    }
  }

}

function setRallyPoint(nexus) {
  const rally = nexus.depot.isSaturated ? nexus.depot.exitRally : nexus.depot.harvestRally;

  if (rally && (!nexus.rally || (nexus.rally.x !== rally.x) || (nexus.rally.y !== rally.y))) {
    return new Order(nexus, 3690, rally, isSetRallyPointAccepted);
  }
}

function isSetRallyPointAccepted() {
  return true;
}

function removeCompletedJobs() {
  for (const [tag, job] of jobs) {
    if (job.isDone || job.isFailed) {
      jobs.delete(tag);
    }
  }
}

function createBuildWorkerJob(nexus) {
  let job = jobs.get(nexus);

  if (!job) {
    job = new Produce(nexus, Types.unit("Probe"));

    jobs.set(nexus, job);
  }
}
