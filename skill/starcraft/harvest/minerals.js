import { Depot } from "./imports.js";
import Harvest from "./job-minerals.js";

const zoneToJobs = new Map();
const zoneToLinesProfile = new Map();

export default function() {
  for (const zone of Depot.list()) {
    const nexus = zone.depot;
    const availableWorkersCount = countAvailableWorkers(zone);

    if (nexus && nexus.isActive) {
      const jobs = getActiveJobs(zone);
      const profile = getLineProfile(zone, availableWorkersCount, jobs);

      if (zoneToLinesProfile.get(zone) !== profile) {
        createJobsForLines(createLines(zone, availableWorkersCount), jobs);
        zoneToLinesProfile.set(zone, getLineProfile(zone, availableWorkersCount, jobs));
      }
    } else {
      const jobs = zoneToJobs.get(zone);

      if (jobs) {
        zoneToJobs.delete(zone);

        for (const job of jobs) {
          job.close(true);
        }
      }
    }
  }
}

class Line {

  constructor(zone, jobsCount, minerals) {
    this.zone = zone;
    this.jobsCount = jobsCount;
    this.details = ["Harvest", zone.name, "minerals", jobsCount, "on", minerals.length].join(" ");

    if ((minerals.length === 2) && (jobsCount === 5)) {
      this.priority = 30;
    } else {
      const distance = getMinDistance(minerals);

      this.priority = ((distance > 5) && (distance < 10)) ? Math.round(50 - distance * 5) : 0;
    }

    this.sequence = new Map();
    this.sequence.set(minerals[minerals.length - 1], minerals[0]);
    for (let i = 0; i < minerals.length - 1; i++) {
      this.sequence.set(minerals[i], minerals[i + 1]);
    }
  }

  addJobs(activeJobs) {
    const jobs = [];
    const mineralFields = [...this.sequence.keys()];
    const mineralFieldToJobCount = new Map();
    let jobsCount = 0;

    for (const field of mineralFields) {
      mineralFieldToJobCount.set(field, 0);
    }

    for (const job of activeJobs) {
      let count = mineralFieldToJobCount.get(job.target);

      if (count >= 0) {
        job.setResource(this, job.target);
        jobs.push(job);
        mineralFieldToJobCount.set(job.target, count + 1);

        if (++jobsCount === this.jobsCount) break;
      }
    }

    if (jobsCount < this.jobsCount) {
      mineralFields.sort((a, b) => (mineralFieldToJobCount.get(a) - mineralFieldToJobCount.get(b)));

      while (jobsCount < this.jobsCount) {
        for (const field of mineralFields) {
          jobs.push(new Harvest(this, field));

          if (++jobsCount === this.jobsCount) break;
        }
      }
    }

    for (const job of jobs) {
      activeJobs.add(job);
    }
  }

}

function countAvailableWorkers(zone) {
  let count = 0;

  for (const worker of zone.workers) {
    if (!worker.isAlive) continue;
    if (!worker.isActive) continue;
    if (worker.job && !worker.job.isHarvestMineralsJob) continue;

    count++;
  }

  return count;
}

function getActiveJobs(zone) {
  let jobs = zoneToJobs.get(zone);

  if (jobs) {
    for (const job of jobs) {
      if (job.isDone || job.isFailed) {
        jobs.delete(job);
      }
    }
  } else {
    jobs = new Set();
    zoneToJobs.set(zone, jobs);
  }

  return jobs;
}

function getLineProfile(zone, availableWorkersCount, activeJobs) {
  return availableWorkersCount + "/" + zone.minerals.size + "=" + activeJobs.size;
}

function createLines(zone, availableWorkersCount) {
  const lines = new Set();

  if (availableWorkersCount <= zone.minerals.size * 2) {
    // Create lines of two workers per mineral field
    for (const one of zone.minerals) {
      lines.add(new Line(zone, 2, [one]));
    }
  } else {
    const minerals = getLineOfMinerals(zone, zone.minerals);
    const pairs = availableWorkersCount - zone.minerals.size - zone.minerals.size;
    let i = 0;

    // Create lines of five workers per two mineral fields
    for (let p = 0; (p < pairs) && (i < minerals.length); p++, i += 2) {
      lines.add(new Line(zone, 5, minerals.slice(i, i + 2)));
    }

    // Create lines of two workers per mineral field
    for (; i < minerals.length; i++) {
      lines.add(new Line(zone, 2, [minerals[i]]));
    }
  }

  return lines;
}

function createJobsForLines(lines, jobs) {
  // Add new jobs
  for (const line of lines) {
    line.addJobs(jobs);
  }

  // Re-assign workers from old jobs to new jobs
  const openJobs = [...jobs].filter(job => (!job.assignee && lines.has(job.line)));
  if (openJobs.length) {
    const harvestWorkers = [...jobs].filter(job => (job.assignee && !lines.has(job.line))).map(job => job.assignee);

    for (let i = 0; i < openJobs.length && i < harvestWorkers.length; i++) {
      openJobs[i].assign(harvestWorkers[i]);
    }
  }

  // Close old jobs
  for (const job of jobs) {
    if (!lines.has(job.line)) {
      job.close(true);
      jobs.delete(job);
    }
  }
}

function getMinDistance(minerals) {
  let min = Infinity;

  for (const field of minerals) {
    if (field.d < min) {
      min = field.d;
    }
  }

  return min;
}

function getLineOfMinerals(zone, minerals) {
  const line = [];

  for (const one of minerals) {
    let isAddedToLine = false;

    for (let i = 0; i < line.length; i++) {
      if (calculateSide(zone, line[i].body, one.body) < 0) {
        line.splice(i, 0, one);
        isAddedToLine = true;
        break;
      }
    }

    if (!isAddedToLine) {
      line.push(one);
    }
  }

  for (let i = 0; i < line.length; i++) {
    line[i].index = i;
  }

  return line;
}

function calculateSide(a, b, c) {
  return Math.sign((b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y));
}
