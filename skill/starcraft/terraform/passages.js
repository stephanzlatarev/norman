import { Job, Order, Zone } from "./imports.js";

const PERIMETER_GREEN = 2;

let corridorToClear = null;
let jobClearMinerals = null;

// Clear passages
export default function() {
  if (!corridorToClear) corridorToClear = findCorridorToClear();

  if (corridorToClear) {
    if (!jobClearMinerals || (jobClearMinerals.zone !== corridorToClear)) {
      jobClearMinerals = new ClearMinerals(corridorToClear);
    }
  }
}

function findCorridorToClear() {
  for (const zone of Zone.list()) {
    if (zone.perimeterLevel >= PERIMETER_GREEN) continue;

    for (const corridor of zone.exits.values()) {
      if (!corridor.via.isCurtain) continue;
      if (corridor.via.isPassage) continue;

      if (corridor.via.minerals && corridor.via.minerals.size) return corridor.via;
    }
  }
}

class ClearMinerals extends Job {

  constructor(zone) {
    super("Probe");

    this.zone = zone;
    this.priority = 50;
  }

  execute() {
    const zone = this.zone;

    if (!zone.minerals.size) {
      // Mineral curtain has been cleared
      corridorToClear = null;
      zone.isPassage = true;
      return this.close(true);
    }

    const worker = this.assignee;
    const target = zone.minerals.has(this.target) ? this.target : selectMineralToClear(zone, worker);

    if (worker.isCarryingHarvest) return;
    if (worker.order.abilityId === 299) return;
    if ((worker.order.abilityId === 298) && (worker.order.targetUnitTag === target.tag)) return;

    new Order(worker, 298, target).accept(true);
  }
}

function selectMineralToClear(zone, worker) {
  let bestDistance = Infinity;
  let bestMineral;

  for (const one of zone.minerals) {
    const distance = Math.abs(one.body.x - worker.body.x) + Math.abs(one.body.y - worker.body.y);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMineral = one;
    }
  }

  return bestMineral;
}
