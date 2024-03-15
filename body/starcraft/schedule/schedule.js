import Job from "../job.js";
import Units from "../units.js";
import Count from "../memo/count.js";
import Limit from "../memo/limit.js";
import Resources from "../memo/resources.js";

import describeSchedule from "./describe.js";

export default function() {
  const jobs = Array.from(Job.list().values());
  const started = jobs.filter(job => !!job.assignee);
  const pending = jobs.filter(job => !job.assignee).sort(prioritizeJobs);

  // Execute all previously started jobs
  for (const job of started) {
    job.execute();
  }

  // Account for resources required for outstanding orders

  // Start and execute as many pending jobs as possible by their priority
  let blockPriority = 0;
  let blockSupply = false;
  let blockMinerals = false;
  let blockVespene = false;

  for (let i = 0; i < pending.length; i++) {
    const job = pending[i];

    // A lower priority job can be started only if it doesn't delay higher priority jobs
    if ((job.priority < blockPriority) && job.output) {
      if (blockSupply && job.output.foodRequired) continue;
      if (blockMinerals && job.output.mineralCost) continue;
      if (blockVespene && job.output.vespeneCost) continue;
    }

    if (job.output) {
      if (Count[job.output.name] >= Limit[job.output.name]) continue;

      if (job.output.foodRequired > Resources.supply) {
        blockPriority = job.priority;
        blockSupply = true;
        continue;
      }

      if (job.output.mineralCost > Resources.minerals) {
        blockPriority = job.priority;
        blockMinerals = true;
        continue;
      }

      if (job.output.vespeneCost > Resources.vespene) {
        blockPriority = job.priority;
        blockVespene = true;
        continue;
      }
    }

    const assignee = findCandidate(job);

    if (assignee) {
      job.assign(assignee);
      job.execute();

      if (job.output) {
        Count[job.output.name]++;

        if (job.output.foodRequired) Resources.supply -= job.output.foodRequired;
        if (job.output.mineralCost) Resources.minerals -= job.output.mineralCost;
        if (job.output.vespeneCost) Resources.vespene -= job.output.vespeneCost;
      }

      started.push(job);
      pending.splice(i--, 1);
    }
  }

  describeSchedule(pending, started);
}

function prioritizeJobs(a, b) {
  return b.priority - a.priority;
}

function findCandidate(job) {
  if (!job.agent) return;

  if (job.agent.tag) {
    return Units.get(job.agent.tag);
  }

  if (job.agent.type.isWorker) {
    for (const unit of Units.workers().values()) {
      if (unit.order.abilityId) continue;
      if (unit.job) continue;
      if (job.agent.depot && (unit.depot !== job.agent.depot)) continue;

      return unit;
    }
  }

  if (job.agent.type.isBuilding) {
    for (const unit of Units.buildings().values()) {
      if (unit.order.abilityId) continue;
      if (unit.job) continue;

      return unit;
    }
  }
}
