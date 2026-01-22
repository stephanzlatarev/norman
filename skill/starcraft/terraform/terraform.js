import { Memory, Resources, TotalCount } from "./imports.js";
import addDetection from "./detection.js";
import addVision from "./vision.js";
import clearPassages from "./passages.js";
import clearRocks from "./rocks.js";

export default function() {
  if (Memory.DeploymentOutreach < Memory.DeploymentOutreachExpandDefense) return;
  if (TotalCount.Nexus < 2) return;

  addVision();

  clearPassages();
  clearRocks();

  if (Resources.minerals >= 800) {
    addDetection();
  }

}
