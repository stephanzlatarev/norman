import { Memory, Resources } from "./imports.js";

export default function() {
  if (Memory.MilestoneMaxArmy) return;

  if (Resources.supplyUsed < 196) return;

  console.log("Milestone Max Army");
  Memory.MilestoneMaxArmy = true;
}
