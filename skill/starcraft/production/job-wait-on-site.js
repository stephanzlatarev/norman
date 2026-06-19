import { Job, Order } from "./imports.js";

export default class WaitOnSite extends Job {

  constructor(probe, rally) {
    super("Probe", null, rally);

    this.probe = probe;

    // Set higher priority than harvest jobs
    this.priority = 85;

    // Disallow re-assignments
    this.isBusy = true;
  }

  accepts(unit) {
    return (unit === this.probe);
  }

  execute() {
    if (isSamePosition(this.probe.body, this.target)) {
      for (const job of Job.list()) {
        if (!job.isBuildJob) continue;
        if (!job.target) continue;

        if (isSamePosition(job.target, this.target)) {
          if (!job.progress) {
            job.designate(this.probe);
          }

          return this.close(true);
        }
      }
    }

    Order.move(this.assignee, this.target);
  }

}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) <= 2) && (Math.abs(a.y - b.y) <= 2);
}
