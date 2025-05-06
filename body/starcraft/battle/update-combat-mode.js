import Plan from "../memo/plan.js";
import Resources from "../memo/resources.js";
import { ActiveCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";

/*
We are in ATTACK combat mode by default.
If we detect an early rush by the enemy, we switch to DEFEND mode.
When we reach the supply limit with low-tier warriors, we switch to CHARGE mode to rotate our army.
When we reach the supply limit with high-tier warriors, we switch back to ATTACK mode.
*/
export default function() {
  let details;

  if (isArmyComplete()) {
    if (Plan.CombatMode !== Plan.CHARGE) console.log("Combat mode set to charge");

    Plan.CombatMode = Plan.CHARGE;
  } else if (details = isEnemyRushing()) {
    if (Plan.CombatMode !== Plan.DEFEND) console.log("Combat mode set to defend", details);

    Plan.CombatMode = Plan.DEFEND;
  } else {
    if (Plan.CombatMode !== Plan.ATTACK) console.log("Combat mode set to attack");

    Plan.CombatMode = Plan.ATTACK;
  }
}

let encounteredMarineCount = 0;
let encounteredZealotCount = 0;
let encounteredZerglingCount = 0;
let detectedEarlySpawningPool = false;

function isArmyComplete() {
  return (Resources.supplyUsed >= 196);
}

function isEnemyRushing() {
  encounteredMarineCount = Math.max(VisibleCount.Marine, encounteredMarineCount);
  encounteredZealotCount = Math.max(VisibleCount.Zealot, encounteredZealotCount);
  encounteredZerglingCount = Math.max(VisibleCount.Zergling, encounteredZerglingCount);

  if (detectedEarlySpawningPool) {
    if (Resources.loop < 3000) return "early spawning pool";
  } else if (VisibleCount.SpawningPool && !ActiveCount.Stalker) {
    detectedEarlySpawningPool = true;
    return "early spawning pool";
  }

  if (encounteredZerglingCount && !ActiveCount.Stalker) return "early zergling rush";
  if ((encounteredZealotCount >= 3) && (encounteredZealotCount > ActiveCount.Stalker)) return "zealot rush";
  if ((encounteredMarineCount >= 6) && (encounteredMarineCount > ActiveCount.Stalker)) return "marine rush";
  if ((encounteredZerglingCount >= 12) && (encounteredZerglingCount > ActiveCount.Stalker * 3)) return "mass zerglings";
}
