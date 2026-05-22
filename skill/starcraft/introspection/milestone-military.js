import { Memory, ActiveCount, Resources, info } from "./imports.js";

export default function() {
  Memory.FlagMaxArmy = !!hasMaxArmy();

  if (Memory.MilestoneMaxArmy) {

    // Highest milestone reached, nothing to do

  } else if (Memory.MilestoneBasicMilitary) {

    if (Memory.FlagMaxArmy) {
      info("strategy", "Milestone Max Army");
      Memory.MilestoneMaxArmy = true;
    }

  } else if (Memory.MilestoneFirstMilitary) {

    if (hasBasicMilitary()) {
      info("strategy", "Milestone Basic Military");
      Memory.MilestoneBasicMilitary = true;
    }

  } else if (hasFirstMilitary()) {

    info("strategy", "Milestone First Military");
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
  if (Memory.FlagMaxArmy) {
    // We already reached max army. Keep the flag until a significant drop in army
    if (Resources.supplyUsed >= 160) return true;
  } else {
    // TODO: Check if total units (active and in production) is close to maximum supply
    if (Resources.supplyUsed >= 196) return true;
  }
}
