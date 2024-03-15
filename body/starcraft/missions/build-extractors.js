import Mission from "../mission.js";
import Units from "../units.js";
import Build from "../jobs/build.js";

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

    for (const nexus of Units.buildings().values()) {
      if (!nexus.depot) continue;
      if (!nexus.depot.vespene.length) continue;

      for (const vespene of nexus.depot.vespene) {
        if (vespene.extractor && vespene.extractor.isAlive) continue;

        this.vespene = vespene;
        this.job = new Build("Assimilator", vespene);

        return;
      }
    }
  }

}
