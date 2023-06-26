import { SPEED, RANGE, DAMAGE, LOOPS_PER_STEP, STEPS_PER_SECOND } from "../units.js";

const GANG = 4;

const SENTRY_COOLDOWN = 0.71 / STEPS_PER_SECOND;
const ZEALOT_COOLDOWN = 13 + LOOPS_PER_STEP;

export default async function(client, hotspot) {
  const matrix = calculateMatrix(hotspot.warriors, hotspot.enemies);

  let pair;
  while (pair = chooseFightPair(matrix, hotspot.warriors, hotspot.enemies)) {
    await fight(hotspot, client, pair);

    updateMatrix(matrix, pair);
  }
}

async function command(client, unitTags, abilityId, targetUnitTag, targetWorldSpacePos) {
  const command = { unitTags: unitTags, abilityId: abilityId, targetUnitTag: targetUnitTag, targetWorldSpacePos: targetWorldSpacePos, queueCommand: false };
  const response = await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });
  if (response.result[0] !== 1) console.log(JSON.stringify(command), ">>", JSON.stringify(response));
}

function weaponTime(unit) {
  if (unit.unitType === 73) {
    // Zealots have two hits
    return (unit.weaponCooldown >= ZEALOT_COOLDOWN) ? 0 : unit.weaponCooldown / LOOPS_PER_STEP;
  } else if (unit.unitType === 77) {
    // Sentries lock on target with negative weapon cooldown
    return (unit.weaponCooldown < 0) ? SENTRY_COOLDOWN : unit.weaponCooldown / LOOPS_PER_STEP;
  }
  return unit.weaponCooldown / LOOPS_PER_STEP;
}

function walkTime(unit, distance) {
  return (distance - RANGE[unit.unitType]) / SPEED[unit.unitType];
}

function engageTime(unit, distance) {
  return Math.max(walkTime(unit, distance), weaponTime(unit));
}

function distance(a, b) {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  return Math.sqrt(dx * dx + dy * dy) - a.radius - b.radius;
}

// TODO: Instead of just walking in the opposite direction, choose a better position considering the enemy units and landscape.
function stepback(hotspot, unit, enemy) {
  let dx = unit.pos.x - enemy.pos.x;
  let dy = unit.pos.y - enemy.pos.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    dy /= Math.abs(dx);
    dy += Math.sign(unit.pos.y - hotspot.pos.y);
    dx = Math.sign(dx);
  } else {
    dx /= Math.abs(dy);
    dx += Math.sign(unit.pos.x - hotspot.pos.x);
    dy = Math.sign(dy);
  }

  return {
    x: unit.pos.x + dx,
    y: unit.pos.y + dy,
  };
}

function calculateMatrix(units, enemies) {
  const matrix = {
    distance: {},
    time: {},
    unitEngaged: [],
    unitDamage: [],
    unitIsRanged: [],
    enemyEngaged: [],
    enemyHealth: [],
    enemyPotentialDamage: [],
    enemyMeleeAttackers: [],
    enemyRangedAttackers: [],
  };

  for (const enemyIndex in enemies) {
    const enemy = enemies[enemyIndex];
    matrix.enemyEngaged[enemyIndex] = false;
    matrix.enemyHealth[enemyIndex] = enemy.health + enemy.shield;
    matrix.enemyPotentialDamage[enemyIndex] = 0;
    matrix.enemyMeleeAttackers[enemyIndex] = 0;
    matrix.enemyRangedAttackers[enemyIndex] = 0;
  }

  for (const unitIndex in units) {
    const unit = units[unitIndex];
    const unitDamage = DAMAGE[unit.unitType];
    const unitIsRanged = (RANGE[unit.unitType] >= 1);

    matrix.unitEngaged[unitIndex] = false;
    matrix.unitDamage[unitIndex] = unitDamage;
    matrix.unitIsRanged[unitIndex] = unitIsRanged;

    const distanceRow = [];
    const timeRow = [];
    for (const enemyIndex in enemies) {
      const d = distance(unit, enemies[enemyIndex]);
      const t = engageTime(unit, d);
      distanceRow.push(d);
      timeRow.push(t);

      if (unitIsRanged) {
        if (t < 1) matrix.enemyPotentialDamage[enemyIndex] += unitDamage;
      } else {
        if (t <= 0) matrix.enemyPotentialDamage[enemyIndex] += unitDamage;
      }
    }
    matrix.distance[unitIndex] = distanceRow;
    matrix.time[unitIndex] = timeRow;
  }

  return matrix;
}

function updateMatrix(matrix, pair) {
  matrix.unitEngaged[pair.unitIndex] = true;
  matrix.enemyHealth[pair.enemyIndex] -= matrix.unitDamage[pair.unitIndex];
  matrix.enemyEngaged[pair.enemyIndex] = (matrix.enemyHealth[pair.enemyIndex] <= 0);

  if (matrix.unitIsRanged[pair.unitIndex]) {
    matrix.enemyRangedAttackers[pair.enemyIndex]++;
  } else {
    matrix.enemyMeleeAttackers[pair.enemyIndex]++;
  }
}

function getFightPair(matrix, units, unitIndex, enemies, enemyIndex) {
  return {
    unitIndex: unitIndex,
    unit: units[unitIndex],
    enemyIndex: enemyIndex,
    enemy: enemies[enemyIndex],
    time: matrix.time[unitIndex][enemyIndex],
    distance: matrix.distance[unitIndex][enemyIndex],
  };
}

function chooseFightPair(matrix, units, enemies) {
  let bestUnitIndex;
  let bestEnemyIndex;

  // Find the unit which is ready to hit
  let bestEnemyRemainingHealth = Infinity;
  for (const unitIndex in matrix.unitEngaged) {
    if (matrix.unitEngaged[unitIndex]) continue;

    for (const enemyIndex in matrix.enemyEngaged) {
      if (matrix.enemyEngaged[enemyIndex]) continue;

      const enemyRemainingHealth = matrix.enemyHealth[enemyIndex] - matrix.enemyPotentialDamage[enemyIndex];
      if (enemyRemainingHealth < bestEnemyRemainingHealth) continue;

      if (matrix.unitIsRanged[unitIndex]) {
        // This is a ranged unit. It must be close enough to the enemy
        if (matrix.time[unitIndex][enemyIndex] < 1) {
          bestUnitIndex = unitIndex;
          bestEnemyIndex = enemyIndex;
          bestEnemyRemainingHealth = enemyRemainingHealth;
        }
      } else {
        // This is a melee unit. It must be next to the enemy
        if (matrix.time[unitIndex][enemyIndex] <= 0) {
          bestUnitIndex = unitIndex;
          bestEnemyIndex = enemyIndex;
          bestEnemyRemainingHealth = enemyRemainingHealth;
        }
      }
    }
  }
  if ((bestUnitIndex >= 0) && (bestEnemyIndex >= 0)) {
    return getFightPair(matrix, units, bestUnitIndex, enemies, bestEnemyIndex);
  }

  // Find the unit which is closest to enemy
  let bestDistance = Infinity;
  let bestTime = Infinity;
  for (const unitIndex in matrix.unitEngaged) {
    if (matrix.unitEngaged[unitIndex]) continue;

    for (const enemyIndex in matrix.enemyEngaged) {
      if (matrix.enemyEngaged[enemyIndex]) continue;
      if (matrix.time[unitIndex][enemyIndex] > bestTime) continue;
      if (!matrix.unitIsRanged[unitIndex] && (matrix.enemyMeleeAttackers[enemyIndex] >= GANG)) continue;

      if ((matrix.time[unitIndex][enemyIndex] < bestTime) || (matrix.distance[unitIndex][enemyIndex] < bestDistance)) {
        bestDistance = matrix.distance[unitIndex][enemyIndex];
        bestTime = matrix.time[unitIndex][enemyIndex];
        bestUnitIndex = unitIndex;
        bestEnemyIndex = enemyIndex;
      }
    }
  }
  if ((bestUnitIndex >= 0) && (bestEnemyIndex >= 0)) {
    return getFightPair(matrix, units, bestUnitIndex, enemies, bestEnemyIndex);
  }
}

async function fight(hotspot, client, pair) {
  if (pair.time < 1) {
    await command(client, [pair.unit.tag], 3674, pair.enemy.tag);
  } else {
    const walk = walkTime(pair.unit, pair.distance) + 6 / LOOPS_PER_STEP;
    const range = weaponTime(pair.unit);

    if (walk > range) {
      await command(client, [pair.unit.tag], 3674, pair.enemy.tag);
    } else {
      await command(client, [pair.unit.tag], 16, undefined, stepback(hotspot, pair.unit, pair.enemy));
    }
  }
}
