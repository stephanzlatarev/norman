import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import BuildingTrain from "../jobs/BuildingTrain.js";
import Limit from "../memo/limit.js";
import Resources from "../memo/resources.js";

// TODO: When mission is converted to skill, there will be one instance per active nexus and just one job at a time
const jobs = new Map();

export default class BuildWorkersMission extends Mission {

  run() {
    removeCompletedJobs();

    Resources.supplyUsed += jobs.size;
    Resources.supplyWorkers += jobs.size;

    if (Resources.minerals < 50) return;
    if (Resources.supplyUsed >= Resources.supplyLimit) return;
    if (Resources.supplyWorkers >= Limit.Worker) return;

    for (const nexus of Units.buildings().values()) {
      if (!nexus.depot) continue;

      if (setRallyPoint(nexus)) continue;

      if (!nexus.isActive) continue;
      if (nexus.order.abilityId) continue;

      if (Resources.minerals < 50) return;
      if (Resources.supplyUsed >= Resources.supplyLimit) return;
      if (Resources.supplyWorkers >= Limit.Worker) return;

      createBuildWorkerJob(nexus);

      Resources.minerals -= 50;
      Resources.supplyUsed++;
      Resources.supplyWorkers++;
    }
  }

}

function setRallyPoint(nexus) {
  const rally = nexus.depot.isSaturated ? nexus.depot.exitRally : nexus.depot.harvestRally;

  if (rally && (!nexus.rally || (nexus.rally.x !== rally.x) || (nexus.rally.y !== rally.y))) {
    return new Order(nexus, 3690, rally);
  }
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
    job = new BuildingTrain("Probe", nexus);

    jobs.set(nexus, job);
  }
}
