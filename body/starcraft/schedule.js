import Job from "./job.js";
import Types from "./types.js";
import Units from "./units.js";

const Building = Types.get("Building");
const Worker = Types.get("Worker");

export default function() {
  const jobs = Array.from(Job.list().values());
  const started = jobs.filter(job => !!job.assignee);
  const pending = jobs.filter(job => !job.assignee).sort(prioritizeJobs);

  startJobs(pending, started);

  show(pending, started);

  for (const job of started) {
    job.execute();
  }
}

function prioritizeJobs(a, b) {
  return b.priority - a.priority;
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

let lastShownText = null;

function show(pending, started) {
  if (!pending.length) return;

  const text = ["Schedule:"];
  let index = 1;

  text.push("");

  for (let i = 0; i < started.length; i++, index++) {
    if (started[i].priority) {
      text.push(describeJob(started[i], index));
    }
  }

  if (pending.length && started.length) {
    text.push("\t-----");
  }

  for (let i = 0; i < pending.length; i++, index++) {
    if (pending[i].priority) {
      text.push(describeJob(pending[i], index));
    }
  }

  text.push("");

  const textToShow = text.join("\r\n");

  if (textToShow !== lastShownText) {
    lastShownText = textToShow;

    console.log(textToShow);
  }
}

function describeJob(job, index) {
  return [
    index,
    job.constructor.name,
    "prio: " + job.priority,
    statusJob(job),
    describeAssignee(job.assignee),
    statusOrder(job.order),
    job.summary,
  ].join("\t");
}

function describeAssignee(assignee) {
  if (!assignee) return "<not assigned>";
  const text = [];
  if (!assignee.isAlive) text.push("dead");
  text.push(assignee.type.name);
  text.push(assignee.nick);
  return text.join(" ");
}

function statusJob(job) {
  if (job.isFailed) return "FAIL";
  if (job.isDone) return "DONE";
  if (job.assignee) return "running";
  return "pending";
}

function statusOrder(order) {
  if (!order) return "no order";
  if (order.isFailed) return "FAIL";
  if (order.isConfirmed) return "CONFIRMED";
  if (order.assignee) return "running";
  return "status=" + order.status;
}
