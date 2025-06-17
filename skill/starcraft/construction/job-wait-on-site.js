import { Job, Order } from "./imports.js";

export default class WaitOnSite extends Job {

  constructor(probe, rally) {
    super("Probe", null, rally);

    this.probe = probe;

    // Set higher priority than harvest jobs and lower than build jobs
    this.priority = 85;

    // Allow re-assigning the probe to the build job
    this.isBusy = false;
  }

  accepts(unit) {
    return (unit === this.probe);
  }

  execute() {
    Order.move(this.assignee, this.target);
  }

}
