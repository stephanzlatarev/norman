import { Build, Memory } from "./imports.js";
import { getBestSpreadLocation, STATIC_DETECTION } from "./spread.js";

let cooldown = 0;
let job = null;

// Expand the detection of our perimeter
export default function() {
  if (job) {
    if (job.isFailed) {
      job = null;
    } else if (!job.isDone) {
      return;
    }
  }

  if (Memory.Loop < cooldown) return;

  const plot = getBestSpreadLocation(STATIC_DETECTION);

  if (plot) {
    job = new Build("PhotonCannon", plot);
    job.priority = 50;
  } else {
    // Don't look for plots for 10 seconds
    cooldown = Memory.Loop + 10 * 22.4;
  }
}
