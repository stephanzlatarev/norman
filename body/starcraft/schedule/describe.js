
let lastShownText = null;

export default function(pending, started) {
  if (!pending.length) return;

  const text = ["Schedule:"];
  let index = 1;
  let count = 0;

  text.push("");

  for (let i = 0; i < started.length; i++, index++) {
    if (started[i].priority) {
      text.push(describeJob(started[i], index));
      count++;
    }
  }

  if (pending.length && started.length) {
    text.push("----\tprio\t----");
  }

  for (let i = 0; i < pending.length; i++, index++) {
    if (pending[i].priority) {
      text.push(describeJob(pending[i], index));
      count++;
    }
  }

  text.push("");

  const textToShow = text.join("\r\n");

  if (count && (textToShow !== lastShownText)) {
    lastShownText = textToShow;

    console.log(textToShow);
  }
}

function describeJob(job, index) {
  return [
    index,
    job.priority,
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
