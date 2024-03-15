import Job from "../job.js";
import Types from "../types.js";
import Units from "../units.js";

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
    const candidate = findCandidate(job);

    if (candidate) {
      job.assign(candidate);
      started.push(job);
      pending.splice(i--, 1);
    }
  }
}

function findCandidate(job) {
  if (!job.conditions || !job.conditions.assignee) return;

  if (job.conditions.assignee.tag) {
    return Units.get(job.conditions.assignee.tag);
  }

  if (job.conditions.assignee.type === Worker) {
    for (const unit of Units.workers().values()) {
      if (unit.job) continue;
      if (job.conditions.assignee.depot && (unit.depot !== job.conditions.assignee.depot)) continue;

      return unit;
    }
  }

  if (job.conditions.assignee.type === Building) {
    for (const unit of Units.buildings().values()) {
      if (!unit.job) {
        return unit;
      }
    }
  }
}
