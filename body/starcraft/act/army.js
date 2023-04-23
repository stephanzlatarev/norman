import { DUMMY_TARGETS, WARRIORS, LOOPS_PER_STEP, STEPS_PER_SECOND } from "../units.js";

let armyX;
let armyY;
let lastCommandToLeader;
let lastCommandToSupport;

export default async function(model, client) {
  const game = model.get("Game");
  const army = model.get("Army");
  const leader = army.get("leader");
  if (!leader) return;

  if (army.get("rally")) {
    leader.set("isMobilized", true);

    const location = army.get("rally");
    const locationX = location.get("x");
    const locationY = location.get("y");

    await instruct(model, client, leader, 16, { x: locationX, y: locationY });
  } else if (army.get("attack")) {
    leader.set("isMobilized", true);

    armyX = leader.get("x");
    armyY = leader.get("y");

    const location = army.get("attack");
    const locationX = location.get("x");
    const locationY = location.get("y");
    const squaredDistanceToEnemy = (armyX - locationX) * (armyX - locationX) + (armyY - locationY) * (armyY - locationY);
    const strategyAllowsMicroFighting = (game.get("strategy") !== 5);

    if (strategyAllowsMicroFighting && (squaredDistanceToEnemy < 200) && (await micro(model, client))) {
      const fleetTags = model.observation.ownUnits.filter(unit => FLEET[unit.unitType]).map(unit => unit.tag);
      if (fleetTags.length) {
        await command(client, fleetTags, 3674, undefined, { x: locationX, y: locationY });
      }

      lastCommandToLeader = null;
      lastCommandToSupport = null;
    } else {
      await instruct(model, client, leader, 3674, { x: locationX, y: locationY });
    }
  }
}

async function command(client, unitTags, abilityId, targetUnitTag, targetWorldSpacePos) {
  const command = { unitTags: unitTags, abilityId: abilityId, targetUnitTag: targetUnitTag, targetWorldSpacePos: targetWorldSpacePos, queueCommand: false };
  const response = await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });
  if (response.result[0] !== 1) console.log(JSON.stringify(command), ">>", JSON.stringify(response));
}

async function instruct(model, client, leader, abilityId, position) {
  const leaderTag = leader.label;
  const supportTags = model.observation.ownUnits.filter(unit => ((unit.tag !== leaderTag) && (WARRIORS[unit.unitType]))).map(unit => unit.tag);
  const supportCount = (supportTags ? supportTags.length : 0);

  const digest = leaderTag + "-" + abilityId + "-" + Math.floor(position.x) + ":" + Math.floor(position.y);
  if (digest !== lastCommandToLeader) {
    await command(client, [leaderTag], abilityId, undefined, position);
    lastCommandToLeader = digest;
  }

  if (supportCount) {
    if (abilityId === 3674) {
      const digestSupport = digest + JSON.stringify(supportTags);
      if (digestSupport !== lastCommandToSupport) {
        await command(client, supportTags, 3674, undefined, position);
        lastCommandToSupport = digestSupport;
      }
    } else {
      const digestSupport = leaderTag + "-" + abilityId + "-" + JSON.stringify(supportTags);
      if (digestSupport !== lastCommandToSupport) {
        await command(client, supportTags, 1, leaderTag);
        lastCommandToSupport = digestSupport;
      }
    }
  } else {
    lastCommandToSupport = null;
  }
}

const GANG = 4;

const MICRO_FIGHT_WARRIORS = {
  73: "zealot",
  74: "stalker",
  76: "templar",
  77: "sentry",
};

const WORKERS = {
  84: "probe",
};

const IS_RANGED = {
  73: false, // zealot
  74: true,  // stalker
  76: false, // templar
  77: true,  // sentry
  84: false, // probe
};

const FLEET = {
  10: "mothership",
  79: "carrier",
  78: "phoenix",
  80: "voidray",
};

const SPEED = {
  73: (3.15 / STEPS_PER_SECOND), // zealot
  74: (3.15 / STEPS_PER_SECOND), // stalker
  76: (3.94 / STEPS_PER_SECOND), // templar
  77: (4.15 / STEPS_PER_SECOND), // sentry
  84: (3.94 / STEPS_PER_SECOND), // probe
};

const RANGE = {
  73: 0.1, // zealot
  74: 6.0, // stalker
  76: 0.1, // templar
  77: 5.0, // sentry
  84: 0.1, // probe
};

const DAMAGE = {
  73:  8, // zealot
  74: 13, // stalker
  74: 45, // templar
  77:  6, // sentry
  84:  5, // probe
};

const SENTRY_COOLDOWN = 0.71 / STEPS_PER_SECOND;
const ZEALOT_COOLDOWN = 13 + LOOPS_PER_STEP;

const LIGHT_ENEMY_WARRIORS = {
  48: "marine",
  105: "zergling",
};

function isValidTarget(unit) {
  return !DUMMY_TARGETS[unit.unitType] && (unit.displayType === 1) && !unit.isHallucination;
}

function isLightTarget(unit) {
  return LIGHT_ENEMY_WARRIORS[unit.unitType];
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

function stepback(unit, enemy) {
  let dx = unit.pos.x - enemy.pos.x;
  let dy = unit.pos.y - enemy.pos.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    dy /= Math.abs(dx);
    dy += Math.sign(unit.pos.y - armyY);
    dx = Math.sign(dx);
  } else {
    dx /= Math.abs(dy);
    dx += Math.sign(unit.pos.x - armyX);
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
    const unitIsRanged = IS_RANGED[unit.unitType];

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

async function fight(client, pair) {
  if (pair.time < 1) {
    await command(client, [pair.unit.tag], 3674, pair.enemy.tag);
  } else {
    const walk = walkTime(pair.unit, pair.distance) + 6 / LOOPS_PER_STEP;
    const range = weaponTime(pair.unit);

    if (walk > range) {
      await command(client, [pair.unit.tag], 3674, pair.enemy.tag);
    } else {
      await command(client, [pair.unit.tag], 16, undefined, stepback(pair.unit, pair.enemy));
    }
  }
}

async function micro(model, client) {
  const enemies = model.observation.enemyUnits.filter(isValidTarget);
  if (!enemies.length) return false;
  orderTargets(enemies);

  const units = model.observation.ownUnits.filter(unit => MICRO_FIGHT_WARRIORS[unit.unitType]);

  if (units.length < enemies.length) {
    // Support with close-by workers
    const workers = model.observation.ownUnits.filter(unit => (WORKERS[unit.unitType] && near(unit, armyX, armyY, 20))).sort((a, b) => a.tag.localeCompare(b.tag));

    if (workers.length) {
      // Limit mobilized workers to 3 per enemy
      let workersLimit = enemies.length * 3;

      if (units.length) {
        // Reduce mobilized workers when there are own warriors and when enemy uses light warriors
        const lightEnemies = model.observation.enemyUnits.filter(isLightTarget);
        workersLimit = Math.max((enemies.length * 2 - lightEnemies.length - units.length * 2 + 1) * 2, 0);
      }
      if (workers.length > workersLimit) {
        workers.length = workersLimit;
      }
    }
    for (const worker of workers) {
      model.get(worker.tag).set("isMobilized", true);
      units.push(worker);
    }
  }
  if (!units.length) return false;

  const matrix = calculateMatrix(units, enemies);

  let pair;
  while (pair = chooseFightPair(matrix, units, enemies)) {
    await fight(client, pair);
    updateMatrix(matrix, pair);
  }

  return true;
}

function near(unit, x, y, distance) {
  return (Math.abs(unit.pos.x - x) <= distance) && (Math.abs(unit.pos.y - y) <= distance);
}

function orderTargets(enemies) {
  lowerPriorityOfRepairedBunkers(enemies);
}

function lowerPriorityOfRepairedBunkers(enemies) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const bunker = enemies[i];
    if (bunker.unitType !== 24) continue;
    const bunkerX = bunker.pos.x;
    const bunkerY = bunker.pos.y;
    if (enemies.find(unit => (((unit.unitType === 45) || (unit.unitType === 268)) && near(unit, bunkerX, bunkerY, 3)))) {
      enemies.splice(i, 1);
    }
  }
}
