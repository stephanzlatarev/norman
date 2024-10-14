import Job from "../job.js";
import Order from "../order.js";

export default class HarvestVespene extends Job {

  isHarvestVespeneJob = true;

  constructor(extractor) {
    super("Probe", null, extractor);

    this.zone = extractor.zone;
    this.priority = 50;
  }

  accepts(unit) {
    return (unit.zone === this.zone);
  }

  execute() {
    const extractor = this.target;

    if (!extractor) return;

    if (!extractor.isAlive || !extractor.isActive) {
      return this.close(true);
    }

    const worker = this.assignee;

    if (!this.order || (this.order.target !== extractor)) {
      this.order = new Order(worker, 1, extractor).accept(true);
    }
  }

}
