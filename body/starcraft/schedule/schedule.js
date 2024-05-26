import Job from "../job.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import Limit from "../memo/limit.js";
import Resources from "../memo/resources.js";

export default function() {
  const jobs = Array.from(Job.list().values());
  const started = jobs.filter(job => !!job.assignee);
  const pending = jobs.filter(job => !job.assignee).sort(prioritizeJobs);

  // Execute all previously started jobs
  for (const job of started) {
    job.execute();
  }

  // Account for resources required for outstanding orders
  for (const order of Order.list()) {
    if (order.output && (!order.isIssued || !order.isAccepted)) {
      if (order.output.foodRequired) Resources.supply -= order.output.foodRequired;
      if (order.output.mineralCost) Resources.minerals -= order.output.mineralCost;
      if (order.output.vespeneCost) Resources.vespene -= order.output.vespeneCost;
    }
  }

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
      if (TotalCount[job.output.name] >= Limit[job.output.name]) continue;

      if (job.output.techRequirement) {
        const tech = Types.unit(job.output.techRequirement);

        if (!ActiveCount[tech.name]) continue;
      }

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

    const assignee = findCandidate(job.agent, job.priority);

    if (assignee) {
      job.assign(assignee);
      job.execute();

      if (job.output) {
        TotalCount[job.output.name]++;

        if (job.output.foodRequired) Resources.supply -= job.output.foodRequired;
        if (job.output.mineralCost) Resources.minerals -= job.output.mineralCost;
        if (job.output.vespeneCost) Resources.vespene -= job.output.vespeneCost;
      }

      started.push(job);
      pending.splice(i--, 1);
    }
  }
}

function prioritizeJobs(a, b) {
  return b.priority - a.priority;
}

function findCandidate(profile, priority) {
  if (!profile) return;

  if (profile.tag) {
    return Units.get(profile.tag);
  }

  if (profile.type.isWorker) {
    // First, try to find a worker without a job
    for (const unit of Units.workers().values()) {
      if (unit.job) continue;
      if (profile.depot && (unit.depot !== profile.depot)) continue;

      return unit;
    }

    // Second, try to find a worker with non-committed job
    for (const unit of Units.workers().values()) {
      if (unit.job && (unit.job.isCommitted || (unit.job.priority >= priority))) continue;
      if (profile.depot && (unit.depot !== profile.depot)) continue;

      return unit;
    }
  }

  if (profile.type.isWarrior) {
    // First, try to find a warrior without a job
    for (const unit of Units.warriors().values()) {
      if (unit.job) continue;
      if (profile.type.name && (unit.type !== profile.type)) continue;

      return unit;
    }

    // Second, try to find a warrior with non-committed job
    for (const unit of Units.warriors().values()) {
      if (unit.job && (unit.job.isCommitted || (unit.job.priority >= priority))) continue;
      if (profile.type.name && (unit.type !== profile.type)) continue;

      return unit;
    }
  }
}
