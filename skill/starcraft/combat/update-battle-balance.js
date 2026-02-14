
export default function(battle) {
  const enemyStrength = calculateEnemyStrength(battle);
  const balanceFactor = calculateBalanceFactor(battle);

  battle.recruitedStrength = calculateWarriorStrength(battle, false);
  battle.recruitedBalance = calculateBalance(battle.recruitedStrength, enemyStrength, balanceFactor);

  battle.deployedStrength = calculateWarriorStrength(battle, true);
  battle.deployedBalance = calculateBalance(battle.deployedStrength, enemyStrength, balanceFactor);
}

function calculateEnemyStrength(battle) {
  let damage = 0;
  let armyHealth = 0;
  let totalHealth = 0;

  for (const sector of battle.sectors) {
    for (const enemy of sector.threats) {
      totalHealth += enemy.armor.total;

      if (!enemy.type.isWorker && (enemy.type.damageGround > 0)) {
        damage += enemy.type.damageGround;
        armyHealth += enemy.armor.total;
      }

      if (enemy.type.name === "Immortal") {
        // Immortals have bonus damage against my main unit Stalkers
        damage += enemy.type.damageGround * 1.5;

        // Immortals absorb up to 100 damage
        armyHealth += 100;
      } else if (enemy.type.name === "ShieldBattery") {
        armyHealth += 300;
      }
    }
  }

  battle.enemyHealth = totalHealth;
  battle.enemyStrength = armyHealth * damage;

  return battle.enemyStrength;
}

function calculateWarriorStrength(battle, isDeployed) {
  let warriorDamage = 0;
  let warriorHealth = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (!warrior || !warrior.isAlive) continue;
    if (isDeployed && !battle.sectors.has(warrior.sector)) continue;

    warriorDamage += warrior.type.damageGround;
    warriorHealth += warrior.armor.total;
  }

  return warriorHealth * warriorDamage;
}

function calculateBalanceFactor(battle) {
  let factor = 1;

  for (const building of battle.front.buildings) {
    if (!building.isActive) continue;

    if (building.type.name === "ShieldBattery") {
      factor = 2;
    }
  }

  return factor;
}

function calculateBalance(warriorStrength, enemyStrength, balanceFactor) {
  if (warriorStrength <= 0) {
    return 0;
  } else if (enemyStrength > 0) {
    return (warriorStrength * balanceFactor / enemyStrength);
  } else {
    return Infinity;
  }
}
