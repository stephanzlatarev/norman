import Mission from "../mission.js";
import Units from "../units.js";
import WorkerBuild from "../jobs/WorkerBuild.js";
import Count from "../memo/count.js";
import Limit from "../memo/limit.js";
import Resources from "../memo/resources.js";

const EXTRACTOR_TYPE = "Assimilator";

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

    if (Resources.minerals < 75) return;
    if (Count[EXTRACTOR_TYPE] >= Limit[EXTRACTOR_TYPE]) return;

    for (const nexus of Units.buildings().values()) {
      if (!nexus.depot) continue;
      if (!nexus.depot.vespene.length) continue;

      for (const vespene of nexus.depot.vespene) {
        if (vespene.extractor && vespene.extractor.isAlive) continue;

        this.vespene = vespene;
        this.job = new WorkerBuild(EXTRACTOR_TYPE, vespene);

        Resources.minerals -= 75;

        return;
      }
    }
  }

}
