import { Depot, Limit, Memory, Order, Produce, TotalCount, Types } from "./imports.js";

const jobs = new Map();

export default function() {
  for (const [nexus, job] of jobs) {
    if (job.isDone || job.isFailed) {
      jobs.delete(nexus);
    }
  }

  if (TotalCount.Probe >= Limit.Probe) return;

  const isUnderSiege = (Memory.DeploymentOutreach === Memory.DeploymentOutreachSiegeDefense);

  for (const zone of Depot.list()) {
    const nexus = zone.depot;

    if (!nexus) continue;
    if (!nexus.zone) continue;
    if (!nexus.isActive) continue;

    if (isUnderSiege) {
      if (zone === Depot.home) {
        // Don't produce workers if home base is already saturated
        if (zone.workers.size >= 26) continue;
      } else {
        // Don't produce workers outside home base. Abort any open jobs.
        const job = jobs.get(nexus);

        if (job) {
          job.abort();
          jobs.delete(nexus);
        }

        continue;
      }
    }

    if (jobs.has(nexus)) continue;
    if (nexus.job && !nexus.job.isDone && !nexus.job.isFailed) continue;
    if (setRallyPoint(nexus)) continue;

    jobs.set(nexus, new Produce(nexus, Types.unit("Probe")));

    TotalCount.Probe++;
    if (TotalCount.Probe >= Limit.Probe) return;
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
