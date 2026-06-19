import { Memory, Build, Priority } from "./imports.js";

let job;

export default function() {
  if (job) {
    // Make sure the job is of the right priority
    job.priority = Priority.Nexus;

    if (!Memory.PinNextExpansionX || !Memory.PinNextExpansionY) {
      job.close(true);
      job = null;
      return;
    } else if (job.isFailed) {
      job = null;
    } else if (!job.isDone) {
      // Continue with the same job
      return;
    }
  }

  if (Memory.PinNextExpansionX && Memory.PinNextExpansionY) {
    job = new Build("Nexus", { x: Memory.PinNextExpansionX, y: Memory.PinNextExpansionY });
  }
}
