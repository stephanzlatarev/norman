import { Memory, Sector } from "./imports.js";

export default function() {
  const previousLevel = Memory.LevelEnemyArmySuperiority;

  let enemyDamage = 0;
  let enemyHealth = 0;
  let warriorDamage = 0;
  let warriorHealth = 0;

  for (const sector of Sector.list()) {
    for (const warrior of sector.warriors) {
      if (!warrior.isAlive) continue;
      if (!warrior.type.movementSpeed) continue;
      if (warrior.type.isWorker) continue;

      warriorDamage += warrior.type.damageGround;
      warriorHealth += warrior.armor.total;
    }

    for (const threat of sector.threats) {
      if (!threat.type.movementSpeed) continue;
      if (!threat.type.isWarrior) continue;
      if (threat.type.isWorker) continue;

      enemyDamage += threat.type.damageGround;
      enemyHealth += threat.armor.total;
    }
  }

  const warriorStrength = warriorHealth * warriorDamage;
  const enemyStrength = enemyHealth * enemyDamage;
  const currentLevel = warriorStrength ? (enemyStrength / warriorStrength) : Infinity;

  if (previousLevel && (Math.round(previousLevel * 10) != Math.round(currentLevel * 10))) {
    console.log("Level of enemy army superiority changes from", previousLevel, "to", currentLevel);
  }

  Memory.LevelEnemyArmySuperiority = currentLevel;
}
