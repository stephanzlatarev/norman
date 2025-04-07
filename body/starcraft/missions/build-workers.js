import Mission from "../mission.js";
import Order from "../order.js";
import Types from "../types.js";
import Produce from "../jobs/produce.js";
import Depot from "../map/depot.js";
import { TotalCount } from "../memo/count.js";
import Limit from "../memo/limit.js";

const jobs = new Map();

export default class BuildWorkersMission extends Mission {

  run() {
    for (const [nexus, job] of jobs) {
      if (job.isDone || job.isFailed) {
        jobs.delete(nexus);
      }
    }

    if (TotalCount.Probe >= Limit.Probe) return;

    for (const zone of Depot.list()) {
      const nexus = zone.depot;

      if (!nexus) continue;
      if (!nexus.zone) continue;
      if (!nexus.isActive) continue;
      if (jobs.has(nexus)) continue;
      if (nexus.job && !nexus.job.isDone && !nexus.job.isFailed) continue;
      if (setRallyPoint(nexus)) continue;

      jobs.set(nexus, new Produce(nexus, Types.unit("Probe")));

      TotalCount.Probe++;
      if (TotalCount.Probe >= Limit.Probe) return;
    }
  }

}

function setRallyPoint(nexus) {
  const depot = nexus.zone;
  const maxWorkerCount = Math.floor(depot.minerals.size * 5 / 2) + depot.extractors.size * 3;
  const isSaturated = (depot.workers.size >= maxWorkerCount);
  const rally = isSaturated ? depot.exitRally : depot.harvestRally;

  if (rally && (!nexus.rally || (nexus.rally.x !== rally.x) || (nexus.rally.y !== rally.y))) {
    return new Order(nexus, 3690, rally).accept(true);
  }
}
