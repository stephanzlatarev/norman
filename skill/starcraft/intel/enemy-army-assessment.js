import { Memory, Sector, info } from "./imports.js";

let previousRange = calculateRange(Infinity);

export default function() {
  const previousLevel = Memory.LevelEnemyArmySuperiority;

  let enemyCount = 0;
  let enemyDamage = 0;
  let enemyHealth = 0;
  let warriorCount = 0;
  let warriorDamage = 0;
  let warriorHealth = 0;

  for (const sector of Sector.list()) {
    for (const warrior of sector.warriors) {
      if (!warrior.isAlive) continue;
      if (!warrior.type.movementSpeed) continue;
      if (warrior.type.isWorker) continue;

      warriorCount++;
      warriorDamage += warrior.type.damageGround;
      warriorHealth += warrior.armor.total;
    }

    for (const threat of sector.threats) {
      if (!threat.type.movementSpeed) continue;
      if (!threat.type.isWarrior) continue;
      if (threat.type.isWorker) continue;

      enemyCount++;
      enemyDamage += threat.type.damageGround;
      enemyHealth += threat.armor.total;
    }
  }

  const warriorStrength = warriorHealth * warriorDamage;
  const enemyStrength = enemyHealth * enemyDamage;
  const currentLevel = warriorStrength ? (enemyStrength / warriorStrength) : Infinity;
  const currentRange = calculateRange(currentLevel);

  if (currentRange !== previousRange) {
    info("strategy", "Level of enemy army superiority changes from", previousLevel.toFixed(2), "to", currentLevel.toFixed(2));
    info("strategy", warriorCount, "warriors", "vs", enemyCount, "enemies");
    previousRange = currentRange;
  }

  Memory.LevelEnemyArmySuperiority = currentLevel;
}

function calculateRange(level) {
  if (level <= 0) {
    return 0;
  } else if (level <= 0.5) {
    return 1;
  } else if (level <= 1.0) {
    return 2;
  } else if (level <= 1.5) {
    return 3;
  } else if (level <= 2.0) {
    return 4;
  } else if (level <= 5.0) {
    return 5;
  } else if (level <= 10) {
    return 6;
  } else {
    return 7;
  }
}
