import Mission from "../mission.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import Count from "../memo/count.js";
import Limit from "../memo/limit.js";
import Resources from "../memo/resources.js";

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
    if (Count["Assimilator"] >= Limit["Assimilator"]) return;

    for (const nexus of Units.buildings().values()) {
      if (!nexus.depot) continue;
      if (!nexus.depot.vespene.length) continue;

      for (const vespene of nexus.depot.vespene) {
        if (vespene.extractor && vespene.extractor.isAlive) continue;

        this.vespene = vespene;
        this.job = new Build("Assimilator", vespene);

        Resources.minerals -= 75;

        return;
      }
    }
  }

}
