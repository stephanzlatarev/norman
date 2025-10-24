import Mission from "../mission.js";
import Build from "../jobs/build.js";
import Base from "../map/base.js";
import Priority from "../memo/priority.js";

export default class BuildExpansionsMission extends Mission {

  job;

  run() {
    if (this.job) {
      // Make sure the job is of the right priority
      this.job.priority = Priority.Nexus;

      if (!Base.expo) {
        this.job.close(true);
        this.job = null;
        return;
      } else if (this.job.isFailed) {
        this.job = null;
      } else if (!this.job.isDone) {
        // Continue with the same job
        return;
      }
    }

    if (Base.expo) {
      this.job = new Build("Nexus", Base.expo);
    }
  }

}
