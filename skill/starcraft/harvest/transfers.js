import { Depot, Job, Order } from "./imports.js";

let job;

// Transfer idle workers from all over the map (including non-depot zones) to one nexus that needs harvesters
export default function() {
  if (job) {
    if (job.isDone || job.isFailed) {
      job = null;
    } else if (!job.assignee && !doesNeedHarvesters(job.zone)) {
      job.close(true);
      job = null;
    } else if (!job.assignee) {
      // The open transfer job is valid. No need to create another.
      return;
    }
  }

  const zone = findTransferZone();

  if (zone) {
    job = new Transfer(zone);
  }
}

class Transfer extends Job {

  isTransferJob = true;

  constructor(zone) {
    super("Probe", null, zone);

    this.zone = zone;
    this.priority = (zone.depot && zone.depot.isActive) ? 2 : 1;

    this.summary = "Transfer to " + zone.name;
    this.details = this.summary;
  }

  accepts(unit) {
    return unit.type.isWorker && (unit.zone !== this.zone) && canSendHarvesters(unit.zone);
  }

  execute() {
    if (!this.assignee.isAlive) return this.close(false);

    if (!this.order) {
      if (this.zone.minerals.size) {
        // If there are minerals in the zone then mineral walk to it
        this.order = new Order(this.assignee, 298, [...this.zone.minerals][0]).accept(true);
      } else {
        // Otherwise, move to it
        this.order = new Order(this.assignee, 16, this.zone).accept(true);
      }
    } else if (this.order.isRejected) {
      this.close(false);
    } else if ((this.assignee.zone === this.zone) && this.zone.depot && this.zone.depot.isActive) {
      this.close(true);
    }
  }

}

function findTransferZone() {
  for (const zone of Depot.list()) {
    if (canReceiveHarvesters(zone)) {
      return zone;
    }
  }

  for (const zone of Depot.list()) {
    if (zone.depot && (zone.depot.buildProgress < 1)) {
      return zone;
    }
  }
}

function canSendHarvesters(zone) {
  if (!zone.depot || !zone.depot.isActive) return true;

  return (countWorkersAfterTransfers(zone) > calculateNeedHarvesters(zone));
}

function canReceiveHarvesters(zone) {
  return zone.depot && zone.depot.isActive && doesNeedHarvesters(zone);
}

function doesNeedHarvesters(zone) {
  return (countWorkersAfterTransfers(zone) < calculateNeedHarvesters(zone));
}

function countWorkersAfterTransfers(zone) {
  let count = zone.workers.size;

  for (const job of Job.list()) {
    if (job.isTransferJob && job.assignee) {
      if ((job.zone === zone) && (job.assignee.zone !== zone)) count++;
      if ((job.assignee.zone === zone) && (job.zone !== zone)) count--;
    }
  }

  return count;
}

function calculateNeedHarvesters(zone) {
  if (!zone.minerals || !zone.extractors) return 0;

  const neededMineralHarvesters = (zone.minerals.size === 8) ? 20 : zone.minerals.size * 2;
  const neededVespeneHarvesters = zone.extractors.size * 3;

  return neededMineralHarvesters + neededVespeneHarvesters;
}
