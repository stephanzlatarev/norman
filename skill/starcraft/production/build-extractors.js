import { Build, Depot, Limit, TotalCount } from "./imports.js";

let job;
let vespene;

export default function() {
  if (job) {
    if (job.isFailed) {
      vespene = null;
      job = null;
    } else if (job.isDone) {
      job = null;
      vespene = null;
    } else if (vespene.extractor) {
      job.close(true);
      job = null;
      vespene = null;
    } else {
      return;
    }
  }

  if (TotalCount.Assimilator >= Limit.Assimilator) return;

  for (const zone of Depot.list()) {
    if (!zone.depot || !zone.depot.isActive) continue;
    if (zone.extractors.size >= zone.vespene.size) continue;

    for (const geyser of zone.vespene) {
      if (hasExtractor(zone, geyser)) continue;

      vespene = geyser;
      job = new Build("Assimilator", vespene);

      return;
    }
  }
}

function hasExtractor(depot, vespene) {
  if (vespene.extractor && vespene.extractor.isAlive) return true;

  for (const extractor of depot.extractors) {
    if (extractor.isActive && (extractor.body.x === vespene.body.x) && (extractor.body.y === vespene.body.y)) {
      return true;
    }
  }
}
