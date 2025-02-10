import Memory from "../../code/memory.js";
import Types from "./types.js";
import { getHopDistance } from "./map/route.js";
import Priority from "./memo/priority.js";

const jobs = new Set();

export default class Job extends Memory {

  // A short description of the job
  summary;

  // A more detailed description of the job
  details;

  // Priority is a non-negative number. The higher the number, the higher the priority of the job
  priority;

  // A zone where the job will be executed
  zone;

  // A unit or a profile of a unit that can do the job
  agent;

  // The expected resulting product of the job, if any
  output;

  // The target location or unit of the job, if any
  target;

  // This is the unit assigned to execute the job
  assignee;

  // This is the current mode of the job. It's job-specific
  mode;

  // This is the current order issued to the assignee
  order;

  // This is the product of this job
  product;

  // Is job committed for the assigned unit. If not, the unit can take a higher priority job
  isCommitted = true;

  // Is done when completed successfully
  isDone = false;

  // Is failed when attempted but failed
  isFailed = false;

  constructor(agent, output, target) {
    super();

    this.agent = getAgent(agent);
    this.output = output;
    this.target = target;

    this.summary = this.constructor.name;
    this.details = getDetails(this);
    this.priority = getPriority(output);

    jobs.add(this);
  }

  // Called during job scheduling with the unit to be assigned as arguments. The job may reject a unit if it doesn't meet special criteria.
  accepts() {
    return true;
  }

  // Assigns the given unit to the job.
  assign(unit) {
    if (unit === this.assignee) return;

    if (unit) {
      if (unit.job) {
        if (this.assignee) {
          log(unit.type.name, unit.nick, "re-assigned from job", unit.job.details, "to job", this.details, "replacing", this.assignee.type.name, this.assignee.nick);
        } else {
          log(unit.type.name, unit.nick, "re-assigned from job", unit.job.details, "to job", this.details);
        }

        unit.job.assignee = null;
      } else if (this.assignee) {
        log(unit.type.name, unit.nick, "assigned to job", this.details, "replacing", this.assignee.type.name, this.assignee.nick);
      } else {
        log(unit.type.name, unit.nick, "assigned to job", this.details);
      }

      if (this.assignee && (this.assignee.job === this)) {
        this.assignee.job = null;
      }

      this.assignee = unit;
      this.assignee.job = this;
    } else if (this.assignee) {
      log(this.assignee.type.name, this.assignee.nick, "released from job", this.details);
      this.assignee.job = null;
      this.assignee = null;
    }
  }

  distance(unit) {
    if (!unit) return Infinity;
    if (!this.zone) return 0;

    if (unit.body.isGround) return getHopDistance(unit.cell, this.zone.cell);

    return 0;
  }

  // Executes one step of the job.
  // Job implementations will implement this by issuing the next order.
  execute() {
  }

  shift(mode, silent) {
    if (!silent && (this.mode !== mode) && (this.mode !== undefined) && this.assignee) {
      log(this.assignee.type.name, this.assignee.nick, "switches from", this.modes[this.mode], "to", this.modes[mode], "on job", this.details);
    }

    this.mode = mode;
  }

  // Closes the job and removes the link from the assigned unit.
  close(outcome) {
    this.product = outcome;
    this.isCommitted = false;
    this.isDone = !!outcome;
    this.isFailed = !outcome;

    if (this.assignee && this.assignee.isAlive && (this.assignee.job === this)) {
      log(this.assignee.type.name, this.assignee.nick, "released on", (outcome ? "success" : "failure"), "of job", this.details);

      this.assignee.job = null;
    }

    jobs.delete(this);
  }

  static list() {
    return jobs;
  }

}

function log(...line) {
  console.log(...line);
}

function getAgent(agent) {
  if (agent.tag || agent.type) {
    return agent;
  }

  return { type: agent.name ? agent : Types.unit(agent) };
}

function getDetails(job) {
  const details = [job.constructor.name];

  if (job.output) {
    details.push(job.output.name);
  }

  if (job.target) {
    if (job.target.nick && job.target.type) {
      details.push(job.target.type.name);
      details.push(job.target.nick);
    } else if (job.target.x && job.target.y) {
      details.push(job.target.x.toFixed(1));
      details.push(job.target.y.toFixed(1));
    }
  }

  return details.join(" ");
}

function getPriority(type) {
  if (type) {
    const priority = Priority[type.name];

    if (priority > 0) {
      return priority;
    }
  }

  return 0;
}
