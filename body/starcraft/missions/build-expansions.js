import Memory from "../../../code/memory.js";
import Mission from "../mission.js";
import Build from "../jobs/build.js";
import Priority from "../memo/priority.js";

export default class BuildExpansionsMission extends Mission {

  job;

  run() {
    if (this.job) {
      // Make sure the job is of the right priority
      this.job.priority = Priority.Nexus;

      if (!Memory.PinNextExpansionX || !Memory.PinNextExpansionY) {
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

    if (Memory.PinNextExpansionX && Memory.PinNextExpansionY) {
      this.job = new Build("Nexus", { x: Memory.PinNextExpansionX, y: Memory.PinNextExpansionY });
    }
  }

}
