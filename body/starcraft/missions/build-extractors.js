import Mission from "../mission.js";
import Build from "../jobs/build.js";
import Depot from "../map/depot.js";
import Limit from "../memo/limit.js";
import { TotalCount } from "../memo/count.js";

export default class BuildExtractorsMission extends Mission {

  job;
  vespene;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        this.vespene = null;
        this.job = null;
      } else if (this.job.isDone) {
        this.vespene.extractor = this.job.product;
        this.job = null;
        this.vespene = null;
      } else {
        return;
      }
    }

    if (TotalCount.Assimilator >= Limit.Assimilator) return;

    for (const zone of Depot.list()) {
      if (!zone.depot || !zone.depot.isActive) continue;
      if (zone.extractors.size >= 2) continue;

      for (const vespene of zone.vespene) {
        if (hasExtractor(zone, vespene)) continue;

        this.vespene = vespene;
        this.job = new Build("Assimilator", vespene);

        return;
      }
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
