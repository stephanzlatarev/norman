import { Memory, ActiveCount } from "./imports.js";

export default function() {
  if (Memory.MilestoneBasicMilitary) return;

  if (!ActiveCount.Gateway) return;
  if (!ActiveCount.CyberneticsCore) return;
  if (!ActiveCount.Observer) return;
  if (ActiveCount.Stalker < 4) return;

  console.log("Milestone Basic Military");
  Memory.MilestoneBasicMilitary = true;
}
