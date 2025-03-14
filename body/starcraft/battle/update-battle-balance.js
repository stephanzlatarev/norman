
export default function(battle) {
  battle.recruitedBalance = calculateBalance(battle, false);
  battle.deployedBalance = calculateBalance(battle, true);
}

function calculateBalance(battle, isDeployed) {
  let warriorDamage = 0;
  let warriorHealth = 0;
  let enemyDamage = 0;
  let enemyHealth = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (!warrior || !warrior.isAlive) continue;
    if (isDeployed && !battle.zones.has(warrior.zone)) continue;

    warriorDamage += warrior.type.damageGround;
    warriorHealth += warrior.armor.total;
  }

  for (const one of battle.zones) {
    for (const enemy of one.threats) {
      if (!enemy.type.isWorker && (enemy.type.damageGround > 0)) {
        enemyDamage += enemy.type.damageGround;
        enemyHealth += enemy.armor.total;
      }

      if (enemy.type.name === "Immortal") {
        // Immortals have bonus damage against my main unit Stalkers
        enemyDamage += enemy.type.damageGround * 1.5;

        // Immortals absorb up to 100 damage
        enemyHealth += 100;
      } else if (enemy.type.name === "ShieldBattery") {
        enemyHealth += 300;
      }
    }
  }

  const warriorStrength = warriorHealth * warriorDamage;
  const enemyStrength = enemyHealth * enemyDamage;

  if (warriorStrength <= 0) {
    return 0;
  } else if (enemyStrength > 0) {
    return (warriorStrength / enemyStrength);
  } else {
    return Infinity;
  }
}
