import debug from "./debug.js";

export default async function(combat) {
  for (const warrior of combat.warriors) {
    if (warrior.mobility) {
      warrior.mobility.update(combat.warriors, combat.enemies, combat.obstacles);
    }
  }

  for (const enemy of combat.enemies) {
    enemy.exposures.update(combat.warriors);
    enemy.canBeAttacked = true;
  }

  let enemy;
  while (enemy = findWeakestEnemy(combat.enemies)) {
    for (const warrior of enemy.exposures.engage()) {
      if (!warrior.cooldown) {
        warrior.isBusy = await performAttack(combat, warrior, enemy);
      }

      debug.arrow(warrior.cooldown ? debug.blue : debug.red, warrior.pos, enemy.pos);
    }

    enemy.canBeAttacked = false;
  }
}

function findWeakestEnemy(enemies) {
  let weakestEnemy;
  let weakestEnemyIsMilitary = false;
  let weakestEnemyTimeToDie = Infinity;

  for (const enemy of enemies) {
    if (!enemy.canBeAttacked) continue;

    if (weakestEnemyIsMilitary && !enemy.isMilitary) continue;
    if (weakestEnemy && !weakestEnemyIsMilitary && enemy.isMilitary) {
      weakestEnemy = null;
      weakestEnemyIsMilitary = false;
      weakestEnemyTimeToDie = Infinity;
    }

    const enemyTimeToDie = enemy.exposures.estimateTimeToDie;
    if (enemyTimeToDie === Infinity) continue;

    if (!weakestEnemy ||
      (enemyTimeToDie < weakestEnemyTimeToDie) ||
      ((enemyTimeToDie === weakestEnemyTimeToDie) && (enemy.health < weakestEnemy.health))
    ) {
      weakestEnemy = enemy;
      weakestEnemyIsMilitary = enemy.isMilitary;
      weakestEnemyTimeToDie = enemyTimeToDie;
    }
  }

  return weakestEnemy;
}

async function performAttack(combat, warrior, enemy) {
  if (warrior.order && (warrior.order.targetUnitTag === enemy.tag)) return true;

  return await combat.command({ unitTags: [warrior.tag], abilityId: 3674, targetUnitTag: enemy.tag, queueCommand: false });
}
