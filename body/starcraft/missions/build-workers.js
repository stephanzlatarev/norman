import Mission from "../mission.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";
import Produce from "../jobs/produce.js";
import { TotalCount } from "../memo/count.js";
import Limit from "../memo/limit.js";

// TODO: When mission is converted to skill, there will be one instance per active nexus and just one job at a time
const jobs = new Map();

export default class BuildWorkersMission extends Mission {

  run() {
    removeCompletedJobs();

    const limit = Math.min(Limit.Probe, TotalCount.Nexus * 16 + TotalCount.Assimilator * 3 + TotalCount.Nexus);

    if (TotalCount.Probe >= limit) return;

    for (const nexus of Units.buildings().values()) {
      if (nexus.job) continue;
      if (!nexus.depot) continue;
      if (!nexus.isActive) continue;
      if (setRallyPoint(nexus)) continue;

      createBuildWorkerJob(nexus);

      if (TotalCount.Probe >= limit) return;
    }
  }

}

function setRallyPoint(nexus) {
  const rally = nexus.depot.isSaturated ? nexus.depot.exitRally : nexus.depot.harvestRally;

  if (rally && (!nexus.rally || (nexus.rally.x !== rally.x) || (nexus.rally.y !== rally.y))) {
    return new Order(nexus, 3690, rally).accept(true);
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
    job = new Produce(nexus, Types.unit("Probe"));

    jobs.set(nexus, job);
    TotalCount.Probe++;
  }
}
