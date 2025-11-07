import { Memory, ActiveCount, Resources } from "./imports.js";

export default function() {
  if (Memory.MilestoneMaxArmy) {

    // Highest milestone reached, nothing to do

  } else if (Memory.MilestoneBasicMilitary) {

    if (hasMaxArmy()) {
      console.log("Milestone Max Army");
      Memory.MilestoneMaxArmy = true;
    }

  } else if (Memory.MilestoneFirstMilitary) {

    if (hasBasicMilitary()) {
      console.log("Milestone Basic Military");
      Memory.MilestoneBasicMilitary = true;
    }

  } else if (hasFirstMilitary()) {

    console.log("Milestone First Military");
    Memory.MilestoneFirstMilitary = true;

  }
}

function hasFirstMilitary() {
  if (ActiveCount.Zealot || ActiveCount.Stalker || ActiveCount.Sentry) return true;
}

function hasBasicMilitary() {
  if (!ActiveCount.Gateway) return;
  if (!ActiveCount.CyberneticsCore) return;
  if (!ActiveCount.Observer) return;
  if (ActiveCount.Stalker < 4) return;

  return true;
}

function hasMaxArmy() {
  // TODO: Check if total units (active and in production) is close to maximum supply
  if (Resources.supplyUsed >= 196) return true;
}
