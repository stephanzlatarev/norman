import Memory from "../../code/memory.js";

const jobs = new Set();

export default class Job extends Memory {

  // A short description of the job
  summary;

  // Priority is a non-negative number. The higher the number, the higher the priority of the job.
  priority;

  // A unit or a profile of a unit that can do the job
  agent;

  // This is the unit assigned to execute the job
  assignee;

  // This is the current order issued to the assignee 
  order;

  // The product of this job
  product;

  // Is done when completed successfully
  isDone = false;

  // Is failed when attempted but failed
  isFailed = false;

  constructor(summary, priority, agent) {
    super();

    this.summary = summary;
    this.priority = (priority > 0) ? priority : 0;
    this.agent = agent;

    jobs.add(this);
  }

  // Assigns the given unit to the job.
  assign(unit) {
    if (unit) {
      if (unit.job) {
        console.log("WARNING! Unit", unit.type.name, unit.nick, "re-assigned from job", unit.job.summary, "to job", this.summary);
      } else {
        console.log("INFO: Unit", unit.type.name, unit.nick, "assigned to job", this.summary);
      }

      unit.job = this;
    }

    this.assignee = unit;
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
      console.log("INFO: Unit", this.assignee.type.name, this.assignee.nick, "released from job", this.summary);

      this.assignee.job = null;
    }

    jobs.delete(this);
  }

  static list() {
    return jobs;
  }

}
