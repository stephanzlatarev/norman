import { Memory, Resources } from "./imports.js";

let milestoneReached = false;

export default function() {
  // TODO: Check if total units (active and in production) is close to max army size
  // When we are rotating the army to stronger units, then we still are maxed out
  if (Memory.MilestoneMaxArmy && (Resources.supplyUsed > 150)) return;

  if (Resources.supplyUsed < 196) return;

  if (milestoneReached) console.log("Milestone Max Army");

  Memory.MilestoneMaxArmy = true;
  milestoneReached = true;
}
