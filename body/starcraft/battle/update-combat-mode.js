import Memory from "../../../code/memory.js";

/*
We are in attack combat mode by default.
If we detect an early rush by the enemy, we switch to defend mode.
When we reach the supply limit with low-tier warriors, we switch to charge mode to rotate our army.
When we reach the supply limit with high-tier warriors, we switch back to attack mode.
*/
export default function() {
  if (Memory.MilestoneMaxArmy) {
    if (!Memory.ModeCombatCharge) console.log("Combat mode set to charge");

    Memory.ModeCombatAttack = false;
    Memory.ModeCombatCharge = true;
    Memory.ModeCombatDefend = false;
  } else if ((Memory.LevelEnemyArmySuperiority > 1) || Memory.LevelEnemyRush) {
    if (!Memory.ModeCombatDefend) console.log("Combat mode set to defend");

    Memory.ModeCombatAttack = false;
    Memory.ModeCombatCharge = false;
    Memory.ModeCombatDefend = true;
  } else {
    if (!Memory.ModeCombatAttack) console.log("Combat mode set to attack");

    Memory.ModeCombatAttack = true;
    Memory.ModeCombatCharge = false;
    Memory.ModeCombatDefend = false;
  }
}
