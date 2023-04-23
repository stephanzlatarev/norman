import { CAN_HIT_AIR, DUMMY_TARGETS, ENEMY_UNITS, LIGHT_WARRIORS, HEAVY_WARRIORS, STATIONARY_WARRIORS, WORKERS, UNIT_RACE } from "../units.js";

const ENEMY_ALERT_SQUARED = 40*40; // Squared distance which raises alert for enemies
const STALK_RANGE_SQUARED = 14*14; // Squared range for stalking enemies - just outside range of tanks in siege mode

let lastKnownEnemy;

export function observeEnemy(model, observation) {
  checkEnemyLocations(model, observation);
  locateEnemy(model, observation);
  countEnemy(model, observation);
}

function countEnemy(model, observation) {
  const count = {};
  let race = 0;

  for (const type in ENEMY_UNITS) {
    count[type] = 0;
  }

  for (const unit of observation.enemyUnits) {
    const type = unit.unitType;

    if (count[type] >= 0) {
      race = UNIT_RACE[type];
      count[type]++;
    }
  }

  const enemies = model.add("Enemy units");
  for (const type in count) {
    enemies.set(ENEMY_UNITS[type], count[type]);
  }

  if (race) {
    model.get("Enemy").set("race", race)
  }
}

function checkEnemyLocations(model, observation) {
  if (!lastKnownEnemy) {
    const enemy = model.get("Enemy");
    lastKnownEnemy = [{ x: enemy.get("baseX"), y: enemy.get("baseY"), count: 1 }];
  }

  for (let i = lastKnownEnemy.length - 1; i >= 0; i--) {
    let known = lastKnownEnemy[i];
    
    if (isLocationVisible(observation, known.x, known.y, known.isFlying ? 10 : 3)) {
      lastKnownEnemy.splice(i, 1);
    }
  }
}

function locateEnemy(model, observation) {
  const army = model.get("Army");
  const base = army.get("base");

  if (!base) return;

  const homebaseX = base.get("x");
  const homebaseY = base.get("y");

  const enemy = model.get("Enemy");
  const oldEnemyWarriorX = enemy.get("warriorX");
  const oldEnemyWarriorY = enemy.get("warriorY");

  const combatFlyingUnits = observation.ownUnits.find(unit => (CAN_HIT_AIR[unit.unitType]));
  const enemyUnits = observation.enemyUnits.filter(unit => isValidTarget(unit, combatFlyingUnits));
  const enemyWarriors = enemyUnits.filter(unit => !DUMMY_TARGETS[unit.unitType]);

  for (const unit of enemyWarriors) unit.distanceToHomebase = distance(unit.pos.x, unit.pos.y, homebaseX, homebaseY);
  enemyWarriors.sort((a, b) => (a.distanceToHomebase - b.distanceToHomebase));
  const enemyUnit = enemyWarriors.length ? enemyWarriors[0] : null;

  if (enemyUnit) {
    // Enemy warriors are in sight. Focus on one of them.
    let oldEnemyCount = enemy.get("warriorCount");
    if (!oldEnemyCount) oldEnemyCount = 1;

    const enemyWarriorWorkers = observation.enemyUnits.filter(unit => isEnemyWarriorWorker(unit, enemyUnit.pos.x, enemyUnit.pos.y)).length;
    const newEnemyCount = enemyWarriors.length + countUnits(enemyWarriors, HEAVY_WARRIORS)
                          - (countUnits(enemyWarriors, LIGHT_WARRIORS) / 2) - (countUnits(enemyWarriors, WORKERS) * 5 / 6);

    enemy.set("visibleCount", newEnemyCount);
    enemy.set("warriorCount", Math.max(newEnemyCount, oldEnemyCount));
    enemy.set("workerCount", enemyWarriorWorkers);

    if (shouldSwitchAttention(oldEnemyWarriorX, oldEnemyWarriorY, enemyUnit, enemyWarriors, homebaseX, homebaseY, army)) {
      // Switch attention to enemy which is closest to homebase
      enemy.set("alert", (enemyUnit.distanceToHomebase <= ENEMY_ALERT_SQUARED) && !STATIONARY_WARRIORS[enemyUnit.unitType]);

      enemy.set("warriorX", enemyUnit.pos.x);
      enemy.set("warriorY", enemyUnit.pos.y);

      const known = getSimilarKnownEnemy(enemyUnit, lastKnownEnemy);
      if (known) {
        if (enemyUnit.distanceToHomebase <= known.distanceToHomebase) {
          known.x = enemyUnit.pos.x;
          known.y = enemyUnit.pos.y;
        }

        known.count = Math.max(known.count, enemy.get("warriorCount"));
      } else {
        lastKnownEnemy.push({
          x: enemyUnit.pos.x, y: enemyUnit.pos.y, distanceToHomebase: enemyUnit.distanceToHomebase,
          isFlying: enemyUnit.isFlying, count: enemy.get("warriorCount")
        });
      }
    }

    enemy.clear("dummyCount");
    enemy.clear("dummyX");
    enemy.clear("dummyY");
  } else {
    // No enemy warrior is in sight. Focus on dummy targets if any.
    enemy.clear("visibleCount");
    enemy.clear("alert");

    if (enemyUnits.length) {
      // Allow to attack the dummy targets
      enemy.set("warriorCount", 0);
      enemy.clear("warriorX");
      enemy.clear("warriorY");
    } else if (lastKnownEnemy.length) {
      let known = lastKnownEnemy[lastKnownEnemy.length - 1];
      
      if (isLocationVisible(observation, known.x, known.y, known.isFlying ? 10 : 3)) {
        lastKnownEnemy.length = lastKnownEnemy.length - 1;

        if (lastKnownEnemy.length) {
          known = lastKnownEnemy[lastKnownEnemy.length - 1];
          enemy.set("warriorCount", known.count);
          enemy.set("warriorX", known.x);
          enemy.set("warriorY", known.y);
        } else {
          enemy.set("warriorCount", 0);
          enemy.clear("warriorX");
          enemy.clear("warriorY");
        }
      } else {
        // We haven't reach the location of last known enemy but we remember the enemy is there
        enemy.set("warriorCount", known.count);
        enemy.set("warriorX", known.x);
        enemy.set("warriorY", known.y);
      }
    } else {
      // No known enemies. Go scouting
      enemy.clear("warriorCount");
      enemy.clear("warriorX");
      enemy.clear("warriorY");
    }

    if (enemyUnits.length) {
      const enemyWorker = enemyUnits.find(unit => WORKERS[unit.unitType]);
      const dummyTarget = enemyWorker ? enemyWorker : enemyUnits[0];

      enemy.set("dummyCount", enemyUnits.length);
      enemy.set("dummyX", dummyTarget.pos.x);
      enemy.set("dummyY", dummyTarget.pos.y);
    } else if (isLocationVisible(observation, enemy.get("dummyX"), enemy.get("dummyY"), 10)) {
      enemy.clear("dummyCount");
      enemy.clear("dummyX");
      enemy.clear("dummyY");
    }
  }

  if (enemy.get("warriorX")) {
    enemy.set("x", enemy.get("warriorX"));
    enemy.set("y", enemy.get("warriorY"));
  } else if (enemy.get("dummyX")) {
    enemy.set("x", enemy.get("dummyX"));
    enemy.set("y", enemy.get("dummyY"));
  } else {
    enemy.clear("x");
    enemy.clear("y");
  }
  enemy.set("flag:fight", true);
}

function getSimilarKnownEnemy(enemyUnit, lastKnownEnemy) {
  for (const known of lastKnownEnemy) {
    if ((Math.abs(known.x - enemyUnit.pos.x) <= 10) && (Math.abs(known.y - enemyUnit.pos.y) <= 10)) {
      return known;
    }
  }
}

function countUnits(units, types) {
  let count = 0;

  for (const unit of units) {
    if (types[unit.unitType]) count++;
  }

  return count;
}

function isValidTarget(unit, combatFlyingUnits) {
  if (!combatFlyingUnits && unit.isFlying) return false;
  if (unit.isHallucination) return false;

  if (unit.unitType === 13) return false; // Ignore changelings

  return (unit.displayType === 1);
}

function isEnemyWarriorWorker(unit, x, y) {
  if (!WORKERS[unit.unitType]) return false;
  if (!near(unit, x, y, 10)) return false;

  return (unit.displayType === 1);
}

function shouldSwitchAttention(oldEnemyX, oldEnemyY, enemyUnit, enemyUnits, homebaseX, homebaseY, army) {
  // Check if the new enemy is a bigger threat
  if (!oldEnemyX || !oldEnemyY) return true;
  const oldFrontLine = distance(oldEnemyX, oldEnemyY, homebaseX, homebaseY) - STALK_RANGE_SQUARED;
  if (enemyUnit.distanceToHomebase < oldFrontLine) {
    // Only switch attention if visible new enemies are more than visible old enemies
    const countVisibleNewEnemies = enemyUnits.filter(unit => unit.distanceToHomebase < oldFrontLine).length;
    return (countVisibleNewEnemies > enemyUnits.length - countVisibleNewEnemies);
  }

  // Check if old enemy is no longer a threat
  if (near(enemyUnit, oldEnemyX, oldEnemyY, 14)) return true;
  if (!enemyUnits.find(unit => (Math.abs(unit.pos.x - oldEnemyX) <= 14) && (Math.abs(unit.pos.y - oldEnemyY) <= 14))) return true;

  const armyLeader = army.get("leader");
  const armyX = armyLeader.get("x");
  const armyY = armyLeader.get("y");
  const armyIsAtOldEnemyLocation = (Math.abs(armyX - oldEnemyX) <= 5) && (Math.abs(armyY - oldEnemyY) <= 5);
  const noEnemiesNearArmy = (!enemyUnits.find(unit => (Math.abs(unit.pos.x - armyX) <= 12) && (Math.abs(unit.pos.y - armyY) <= 12)));
  if (armyIsAtOldEnemyLocation && noEnemiesNearArmy) return true;

  // Otherwise, keep attention to old enemy
  return false;
}

function isLocationVisible(observation, x, y, distance) {
  return !!observation.ownUnits.find(unit => near(unit, x, y, distance));
}

function near(unit, x, y, distance) {
  return (Math.abs(unit.pos.x - x) <= distance) && (Math.abs(unit.pos.y - y) <= distance);
}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
