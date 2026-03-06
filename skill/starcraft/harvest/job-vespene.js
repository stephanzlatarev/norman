import { Job, Order } from "./imports.js";

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

    const depot = extractor.zone.depot;

    if (!depot || !depot.isAlive || !depot.isActive) {
      return this.close(true);
    }

    const worker = this.assignee;

    if (shouldIssueOrder(worker, extractor, depot, this.order)) {
      this.order = new Order(worker, 1, extractor).accept(true);
    }
  }

}

function shouldIssueOrder(worker, extractor, depot, order) {
  if (!order) return true;
  if (order.target !== extractor) return true;

  const orderTargetTag = worker.order?.targetUnitTag;
  if (orderTargetTag && (orderTargetTag !== extractor.tag) && (orderTargetTag !== depot.tag)) return true;
}
