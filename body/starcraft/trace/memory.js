import Memory from "../../../code/memory.js";
import { label as MemoryLabel } from "../../../code/memory.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import Limit from "../memo/limit.js";

export default function(texts) {
  texts.push("Workers: " + ActiveCount.Probe + " / " + TotalCount.Probe + " / " + Limit.Probe);

  if (Memory.FlagHarvesterCapacity) texts.push("Flag Harvester Capacity");
  if (Memory.FlagSupplyBlocked) texts.push("Flag Supply Blocked");

  if (Memory.MilestoneBasicEconomy) texts.push("Milestone Basic Economy");

  if (Memory.FlagMaxArmy) {
    texts.push("Flag Max Army");
  } else if (Memory.MilestoneMaxArmy) {
    texts.push("Milestone Max Army");
  } else if (Memory.MilestoneBasicMilitary) {
    texts.push("Milestone Basic Military");
  } else if (Memory.MilestoneFirstMilitary) {
    texts.push("Milestone First Military");
  }

  if (Memory.DeploymentOutreach) texts.push("Deployment Outreach: " + MemoryLabel("DeploymentOutreach", Memory.DeploymentOutreach));
  if (Memory.LimitBase) texts.push("Limit Base: " + Memory.LimitBase);

  if (Memory.FlagSiegeDefense) texts.push("Flag Siege Defense");
  if (Memory.DetectedEnemyExpansion) texts.push("Detected Enemy Expansion");
  if (Memory.DetectedEnemyHoard) texts.push("Detected Enemy Hoard");
  if (Memory.DetectedEnemyProxy) texts.push("Detected Enemy Proxy");
  if (Memory.LevelEnemyRush) texts.push("Level Enemy Rush: " + Memory.LevelEnemyRush);
  if (Memory.LevelEnemyArmySuperiority) texts.push("Level Enemy Army Superiority: " + Memory.LevelEnemyArmySuperiority);

  texts.push("");
}
