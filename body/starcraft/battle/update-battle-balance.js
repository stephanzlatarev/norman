
export default function(battle) {
  battle.recruitedBalance = calculateBalance(battle, false);
  battle.deployedBalance = calculateBalance(battle, true);
}

function calculateBalance(battle, isDeployed) {
  let warriorCount = 0;
  let warriorDamage = 0;
  let warriorHealth = 0;
  let enemyCount = 0;
  let enemyDamage = 0;
  let enemyHealth = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (!warrior || !warrior.isAlive) continue;
    if (isDeployed && !battle.zones.has(warrior.zone)) continue;

    warriorCount++;
    warriorDamage += warrior.type.damageGround;
    warriorHealth += warrior.armor.total;
  }

  for (const one of battle.zones) {
    for (const enemy of one.threats) {
      enemyCount++;

      if (!enemy.type.isWorker && (enemy.type.damageGround > 0)) {
        enemyDamage += enemy.type.damageGround;
        enemyHealth += enemy.armor.total;
      }

      if (enemy.type.name === "ShieldBattery") {
        enemyHealth += 300;
      }
    }
  }

  const warriorStrength = warriorHealth * warriorDamage;
  const enemyStrength = enemyHealth * enemyDamage;

  if (enemyStrength > 0) {
    return (warriorStrength / enemyStrength);
  } else if (warriorCount < enemyCount * 3) {
    return 0;
  } else {
    return Infinity;
  }
}
