import { Depot } from "./imports.js";
import Harvest from "./job-vespene.js";

const slota = new Map();
const slotb = new Map();
const slotc = new Map();

export default function() {
  for (const zone of Depot.list()) {
    if (!zone.depot) continue;

    for (const extractor of zone.extractors) {
      maintainJob(extractor, slota);
      maintainJob(extractor, slotb);
      maintainJob(extractor, slotc);
    }
  }
}

function maintainJob(extractor, slot) {
  const job = slot.get(extractor);

  if (!job || job.isDone || job.isFailed) {
    slot.set(extractor, new Harvest(extractor));
  }
}
