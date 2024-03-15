import Job from "../job.js";
import Types from "../types.js";
import Units from "../units.js";
import Resources from "../memo/resources.js";

import describeSchedule from "./describe.js";

const Building = Types.unit("Building");
const Worker = Types.unit("Worker");

export default function() {
  const jobs = Array.from(Job.list().values());
  const started = jobs.filter(job => !!job.assignee);
  const pending = jobs.filter(job => !job.assignee).sort(prioritizeJobs);

  closeDeadJobs(started);

  startJobs(pending, started);

  describeSchedule(pending, started);

  for (const job of started) {
    job.execute();
  }
}

function prioritizeJobs(a, b) {
  return b.priority - a.priority;
}

function closeDeadJobs(jobs) {
  for (const job of jobs) {
    if (!job.assignee.isAlive) {
      job.close(false);
    }
  }
}

function startJobs(pending, started) {
  for (let i = 0; i < pending.length; i++) {
    const job = pending[i];

    if (!hasResources(job.output)) continue;

    const candidate = findCandidate(job);

    if (candidate) {
      job.assign(candidate);
      started.push(job);
      pending.splice(i--, 1);
    }
  }
}

function hasResources(output) {
  if (output) {
    if (output.foodRequired > Resources.supply) return false;
    if (output.mineralCost > Resources.minerals) return false;
    if (output.vespeneCost > Resources.vespene) return false;
  }

  return true;
}

function findCandidate(job) {
  if (!job.agent) return;

  if (job.agent.tag) {
    return Units.get(job.agent.tag);
  }

  if (job.agent.type === Worker) {
    for (const unit of Units.workers().values()) {
      if (unit.job) continue;
      if (job.agent.depot && (unit.depot !== job.agent.depot)) continue;

      return unit;
    }
  }

  if (job.agent.type === Building) {
    for (const unit of Units.buildings().values()) {
      if (!unit.job) {
        return unit;
      }
    }
  }
}
