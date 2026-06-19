import { Memory, Depot, ActiveCount, TotalCount, info } from "./imports.js";

export default function() {
  if (Memory.MilestoneBasicEconomy) return;

  if (isBasicEconomyEstablished()) {
    info("economy", "Milestone Basic Economy");
    Memory.MilestoneBasicEconomy = true;
  }
}

function isBasicEconomyEstablished() {
  return (TotalCount.Probe >= 26) && (ActiveCount.Assimilator >= Depot.home.vespene.size);
}
