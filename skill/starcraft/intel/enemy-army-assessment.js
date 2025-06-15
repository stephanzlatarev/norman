import { Memory, Zone } from "./imports.js";

export default function() {
  const previousEnemyArmyIsSuperior = Memory.EnemyArmyIsSuperior;
  let enemyDamage = 0;
  let enemyHealth = 0;
  let warriorDamage = 0;
  let warriorHealth = 0;

  for (const zone of Zone.list()) {
    for (const warrior of zone.warriors) {
      if (!warrior.isAlive) continue;
      if (!warrior.type.movementSpeed) continue;
      if (warrior.type.isWorker) continue;

      warriorDamage += warrior.type.damageGround;
      warriorHealth += warrior.armor.total;
    }

    for (const threat of zone.threats) {
      if (!threat.type.movementSpeed) continue;
      if (!threat.type.isWarrior) continue;
      if (threat.type.isWorker) continue;

      enemyDamage += threat.type.damageGround;
      enemyHealth += threat.armor.total;
    }
  }

  const warriorStrength = warriorHealth * warriorDamage;
  const enemyStrength = enemyHealth * enemyDamage;
  const enemyArmyIsSuperior = (enemyStrength > warriorStrength * 1.5);

  if (enemyArmyIsSuperior != previousEnemyArmyIsSuperior) {
    console.log("Detected that enemy army is", enemyArmyIsSuperior ? "superior" : "not superior");
    console.log(enemyArmyIsSuperior, "vs", previousEnemyArmyIsSuperior);
    Memory.EnemyArmyIsSuperior = enemyArmyIsSuperior;
  }
}
