import Memory from "../../code/memory.js";
import Types from "./types.js";
import Priority from "./memo/priority.js";

const jobs = new Set();

export default class Job extends Memory {

  // A short description of the job
  summary;

  // Priority is a non-negative number. The higher the number, the higher the priority of the job
  priority;

  // A unit or a profile of a unit that can do the job
  agent;

  // The expected resulting product of the job, if any
  output;

  // The target location or unit of the job, if any
  target;

  // This is the unit assigned to execute the job
  assignee;

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

    this.summary = getSummary(this);
    this.priority = getPriority(output);

    jobs.add(this);
  }

  // Assigns the given unit to the job.
  assign(unit) {
    if (unit) {
      if (unit.job) {
        console.log("Unit", unit.type.name, unit.nick, "re-assigned from job", unit.job.summary, "to job", this.summary);

        unit.job.assignee = null;
      } else {
        console.log("Unit", unit.type.name, unit.nick, "assigned to job", this.summary);
      }

      unit.job = this;
    }

    this.assignee = unit;
  }

  release(unit) {
    if (unit && (unit.job === this)) {
      unit.job = null;
    }

    this.assignee = null;
  }

  // Executes one step of the job.
  // Job implementations will implement this by issuing the next order.
  execute() {
  }

  // Closes the job and removes the link from the assigned unit.
  close(outcome) {
    this.product = outcome;
    this.isDone = !!outcome;
    this.isFailed = !outcome;

    if (this.assignee && (this.assignee.job === this)) {
      console.log("Unit", this.assignee.type.name, this.assignee.nick, "released from job", this.summary);

      this.assignee.job = null;
    }

    jobs.delete(this);
  }

  static list() {
    return jobs;
  }

}

function getAgent(agent) {
  if (agent.tag || agent.type) {
    return agent;
  }

  return { type: Types.unit(agent) };
}

function getSummary(job) {
  const summary = [job.constructor.name];

  if (job.output) {
    summary.push(job.output.name);
  }

  if (job.target) {
    if (job.target.nick && job.target.type) {
      summary.push(job.target.type.name);
      summary.push(job.target.nick);
    } else if (job.target.x && job.target.y) {
      summary.push(job.target.x.toFixed(1));
      summary.push(job.target.y.toFixed(1));
    }
  }

  return summary.join(" ");
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
