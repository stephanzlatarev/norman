
export default function(battle) {
  const enemyStrength = calculateEnemyStrength(battle);

  battle.recruitedStrength = calculateWarriorStrength(battle, false);
  battle.recruitedBalance = calculateBalance(battle.recruitedStrength, enemyStrength);

  battle.deployedStrength = calculateWarriorStrength(battle, true);
  battle.deployedBalance = calculateBalance(battle.deployedStrength, enemyStrength);
}

function calculateEnemyStrength(battle) {
  let damage = 0;
  let armyHealth = 0;
  let totalHealth = 0;

  for (const one of battle.zones) {
    for (const enemy of one.threats) {
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
    if (isDeployed && !battle.zones.has(warrior.zone)) continue;

    warriorDamage += warrior.type.damageGround;
    warriorHealth += warrior.armor.total;
  }

  return warriorHealth * warriorDamage;
}

function calculateBalance(warriorStrength, enemyStrength) {
  if (warriorStrength <= 0) {
    return 0;
  } else if (enemyStrength > 0) {
    return (warriorStrength / enemyStrength);
  } else {
    return Infinity;
  }
}
