import Job from "../job.js";

export default function(texts) {
  const jobs = [...Job.list()];
  const started = jobs.filter(job => !!job.assignee).sort(orderByPriorityAndSummary);
  const pending = jobs.filter(job => !job.assignee).sort(orderByPriorityAndSummary);

  texts.push("Job Prio Zone");
  displayJobList(texts, started);

  texts.push("--- ---- ----");
  displayJobList(texts, pending);

  texts.push("");
}

function orderByPriorityAndSummary(a, b) {
  if (b.priority !== a.priority) return b.priority - a.priority;
  if (a.zone && b.zone && (b.summary === a.summary)) return b.zone.name.localeCompare(a.zone.name);

  return b.summary.localeCompare(a.summary);
}

function displayJobList(texts, jobs) {
  let groupText;
  let groupCount;

  for (const job of jobs) {
    const text = threeletter(" ", job.priority) + (job.zone ? threeletter("  ", job.zone.name) : "     ") + "  " + job.summary;

    if (text !== groupText) {
      if (groupCount) {
        texts.push(threeletter("", groupCount) + groupText);
      }

      groupText = text;
      groupCount = 1;
    } else {
      groupCount++;
    }
  }

  if (groupCount) {
    texts.push(threeletter("", groupCount) + groupText);
  }
}

function threeletter(tab, text) {
  if (!text) return tab + "  -";

  if (text >= 0) {
    if (text > 999) return tab + "999";
    if (text > 99) return tab + text;
    if (text > 9) return tab + " " + text;
    return tab + "  " + text;
  } else if (text.length > 0) {
    if (text.length > 3) return tab + text.slice(0, 3);
    if (text.length === 3) return tab + text;
    if (text.length === 2) return tab + " " + text;
    return tab + "  " + text;
  }

  return tab + " X ";
}
