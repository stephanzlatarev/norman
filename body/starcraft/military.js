import { WARRIORS, LEADER_RANK, USES_ENERGY, CAN_HIT_AIR, DUMMY_TARGETS, LIGHT_WARRIORS, HEAVY_WARRIORS, STATIONARY_WARRIORS, WORKERS } from "./units.js";

const ENEMY_ALERT_SQUARED = 40*40; // Squared distance which raises alert for enemies
const STALK_RANGE_SQUARED = 14*14; // Squared range for stalking enemies - just outside range of tanks in siege mode

const lastKnownEnemy = [];
let lastPowerBaseX = -1;
let lastPowerBaseY = -1;

export function observeMilitary(node, client, observation) {
  const strategy = node.get("strategy");
  const homebase = node.get("homebase");
  const army = node.memory.get(node.path + "/army");

  army.set("strategy", strategy);

  if (!army.get("code")) {
    army.set("code", "body/starcraft/unit/army").set("channel", client).set("game", node).set("orders", []);
    lastKnownEnemy.push({ x: node.get("enemyBaseX"), y: node.get("enemyBaseY"), count: 1 });
  }

  if (homebase) {
    observePowerBase(node);
    observeEnemy(node, army, homebase, observation, isMobilizationCalledOff(army));
    observeArmy(strategy, node, army, homebase, observation);
  }
}

function isMobilizationCalledOff(army) {
  return army.get("mobilization") && !(army.get("mobilizeWorkers") > 0);
}

// This is a skill. Sends army to secure the location for a new base
function observePowerBase(node) {
  const thisPowerBaseX = node.get("powerBaseX");
  const thisPowerBaseY = node.get("powerBaseY");

  if (thisPowerBaseX && thisPowerBaseY && (thisPowerBaseX !== lastPowerBaseX) && (thisPowerBaseY !== lastPowerBaseY)) {
    lastKnownEnemy.push({ x: thisPowerBaseX, y: thisPowerBaseY, count: 1 });
    lastPowerBaseX = thisPowerBaseX;
    lastPowerBaseY = thisPowerBaseY;
  }
  
}

function observeArmy(strategy, node, army, homebase, observation) {
  const mobilization = (army.get("mobilizeWorkers") > 0);
  const armyUnits = mobilization
    ? observation.ownUnits.filter(unit => (WARRIORS[unit.unitType] || WORKERS[unit.unitType]))
    : observation.ownUnits.filter(unit => WARRIORS[unit.unitType]);

  const baseX = homebase.get("x");
  const baseY = homebase.get("y");

  army.set("baseX", baseX);
  army.set("baseY", baseY);
  army.set("warriorCount", armyUnits.length);
  army.set("totalCount", observation.playerCommon.foodUsed);
  army.set("mobilization", mobilization ? 1 : 0);

  const leaderTag = army.get("tag");
  let leaderUnits = mobilization
    ? armyUnits.filter(unit => WORKERS[unit.unitType])
    : armyUnits.filter(unit => LEADER_RANK[unit.unitType]);
  if (!leaderUnits.length && mobilization) leaderUnits = armyUnits.filter(unit => LEADER_RANK[unit.unitType]);
  if (!leaderUnits.length) {
    const enemyX = army.get("enemyWarriorX");
    const enemyY = army.get("enemyWarriorY");

    if ((enemyX > 0) && (enemyY > 0)) {
      let leader = leaderTag ? observation.ownUnits.find(unit => (unit.tag === leaderTag)) : null;
  
      if (!leader && (distance(enemyX, enemyY, baseX, baseY) <= STALK_RANGE_SQUARED)) {
        leader = observation.ownUnits.find(unit => WORKERS[unit.unitType]);
      }
  
      if (leader) {
        leaderUnits = [leader];
        army.set("tag", leader.tag);
        node.memory.get(node.path + "/" + leader.tag).set("mobilized", true);
      }
    }
  }

  if (leaderUnits.length && (army.get("enemyWarriorCount") || army.get("enemyDummyCount"))) {
    let leader = leaderTag ? leaderUnits.find(unit => (unit.tag === leaderTag)) : null;

    if (!leader) {
      const enemyX = army.get("enemyWarriorX") ? army.get("enemyWarriorX") : army.get("enemyDummyX");
      const enemyY = army.get("enemyWarriorY") ? army.get("enemyWarriorY") : army.get("enemyDummyY");
      const baseTangence = tangence(baseX, baseY, enemyX, enemyY);

      for (const unit of leaderUnits) {
        unit.squareDistanceToEnemy = squareDistanceInLine(unit.pos.x, unit.pos.y, enemyX, enemyY, baseTangence);
      }

      const order = leaderUnits.sort((a, b) => (a.squareDistanceToEnemy - b.squareDistanceToEnemy));

      for (const unit of order) {
        if (unit.squareDistanceToEnemy <= STALK_RANGE_SQUARED) {
          leader = unit;
        } else {
          break;
        }
      }
    }

    if (!leader) {
      leader = leaderUnits[0];
    }

    const armyPackUnits = armyUnits.filter(unit => near(unit, leader.pos.x, leader.pos.y, 5));

    if (!mobilization) leader = getHighestRank(leader, armyPackUnits);

    army.set("tag", leader.tag);
    army.set("support", armyUnits.filter(unit => ((unit !== leader) && !WORKERS[unit.unitType])).map(unit => unit.tag).sort());
    army.set("supportWorkers", armyUnits.filter(unit => ((unit !== leader) && WORKERS[unit.unitType])).map(unit => unit.tag).sort());

    // We want to know the max energy level a unit in the army pack has
    let armyEnergy = 0;
    let countEnergyUnits = 0;
    for (const unit of armyPackUnits) {
      if (USES_ENERGY[unit.unitType]) {
        countEnergyUnits++;
        armyEnergy = Math.max(armyEnergy, unit.energyMax ? Math.floor(100 * unit.energy / unit.energyMax) : 100);
      }
    }
    if (!countEnergyUnits) armyEnergy = 100;

    army.set("engagedCount", armyPackUnits.filter(unit => (unit.engagedTargetTag !== "0")).length);
    army.set("armyCount", armyPackUnits.length);
    army.set("armyLeaderPack", armyPackUnits.length);
    army.set("armyExtendedPack", armyUnits.filter(unit => near(unit, leader.pos.x, leader.pos.y, 10)).length);
    army.set("armyEnergy", armyEnergy);
    army.set("armyX", leader.pos.x);
    army.set("armyY", leader.pos.y);

    const guardTag = army.get("guardTag");
    let guard = guardTag ? leaderUnits.find(unit => (unit.tag === guardTag)) : null;

    if (strategy === 1) {
      // Single-base strategy doesn't allow a guard
      guard = null;
    } else if (!guard || (distance(guard.pos.x, guard.pos.y, baseX, baseY) > ENEMY_ALERT_SQUARED)) {
      guard = leaderUnits.find(unit => (distance(unit.pos.x, unit.pos.y, baseX, baseY) < ENEMY_ALERT_SQUARED));
    }

    if (guard) {
      army.set("guardTag", guard.tag);
      army.set("guardX", guard.pos.x);
      army.set("guardY", guard.pos.y);
    } else {
      army.clear("guardTag");
      army.clear("guardX");
      army.clear("guardY");
    }
  } else {
    army.set("armyCount", 0);
    army.set("support", []);
    army.set("supportWorkers", []);
    army.clear("tag");
    army.clear("engagedCount");
    army.clear("armyEnergy");
    army.clear("armyX");
    army.clear("armyY");
    army.clear("guardTag");
    army.clear("guardX");
    army.clear("guardY");
  }
}

function getHighestRank(leader, units) {
  let bestLeader = leader;
  let bestRank = LEADER_RANK[leader.unitType];

  for (const unit of units) {
    const unitRank = LEADER_RANK[unit.unitType];

    if (unitRank > bestRank) {
      bestLeader = unit;
      bestRank = unitRank;
    }
  }

  return bestLeader;
}

function observeEnemy(game, army, homebase, observation, isMobilizationCalledOff) {
  const owner = game.get("owner");
  const enemy = game.get("enemy");
  const homebaseX = homebase.get("x");
  const homebaseY = homebase.get("y");
  const oldEnemyWarriorX = army.get("enemyWarriorX");
  const oldEnemyWarriorY = army.get("enemyWarriorY");

  if (isMobilizationCalledOff) {
    console.log("Mobilization is called off");
    lastKnownEnemy.length = 0;
    lastKnownEnemy.push({ x: game.get("enemyBaseX"), y: game.get("enemyBaseY"), count: 1 });
  }

  const armyUnit = army.get("body");
  if (armyUnit) armyUnit.observe(observation, enemy);

  const combatFlyingUnits = observation.rawData.units.find(unit => (CAN_HIT_AIR[unit.unitType] && (unit.owner === owner)));
  const enemyUnits = observation.rawData.units.filter(unit => isValidTarget(unit, enemy, combatFlyingUnits));
  const enemyWarriors = enemyUnits.filter(unit => !DUMMY_TARGETS[unit.unitType]);

  for (const unit of enemyWarriors) unit.distanceToHomebase = distance(unit.pos.x, unit.pos.y, homebaseX, homebaseY);
  enemyWarriors.sort((a, b) => (a.distanceToHomebase - b.distanceToHomebase));
  const enemyUnit = enemyWarriors.length ? enemyWarriors[0] : null;

  if (enemyUnit) {
    // Enemy warriors are in sight. Focus on one of them.
    let oldEnemyCount = army.get("enemyWarriorCount");
    if (!oldEnemyCount) oldEnemyCount = 1;

    const enemyWarriorWorkers = observation.rawData.units.filter(unit => isEnemyWarriorWorker(unit, enemy, enemyUnit.pos.x, enemyUnit.pos.y)).length;
    const newEnemyCount = enemyWarriors.length + countUnits(enemyWarriors, HEAVY_WARRIORS)
                          - (countUnits(enemyWarriors, LIGHT_WARRIORS) / 2) - (countUnits(enemyWarriors, WORKERS) * 5 / 6);

    army.set("enemyVisibleCount", newEnemyCount);
    army.set("enemyWarriorCount", Math.max(newEnemyCount, oldEnemyCount));
    army.set("enemyWarriorWorkerCount", enemyWarriorWorkers);

    if (shouldSwitchAttention(oldEnemyWarriorX, oldEnemyWarriorY, enemyUnit, enemyWarriors, homebaseX, homebaseY, army)) {
      // Switch attention to enemy which is closest to homebase
      army.set("enemyAlert", (enemyUnit.distanceToHomebase <= ENEMY_ALERT_SQUARED) && !STATIONARY_WARRIORS[enemyUnit.unitType]);

      army.set("enemyWarriorX", enemyUnit.pos.x);
      army.set("enemyWarriorY", enemyUnit.pos.y);

      const known = getSimilarKnownEnemy(enemyUnit, lastKnownEnemy);
      if (known) {
        known.count = Math.max(known.count, army.get("enemyWarriorCount"));
      } else {
        lastKnownEnemy.push({ x: enemyUnit.pos.x, y: enemyUnit.pos.y, isFlying: enemyUnit.isFlying, count: army.get("enemyWarriorCount") });
      }
    }

    army.clear("enemyDummyCount");
    army.clear("enemyDummyX");
    army.clear("enemyDummyY");
  } else {
    // No enemy warrior is in sight. Focus on dummy targets if any.
    army.clear("enemyVisibleCount");
    army.clear("enemyAlert");

    if (enemyUnits.length) {
      // Allow to attack the dummy targets
      army.set("enemyWarriorCount", 0);
      army.clear("enemyWarriorX");
      army.clear("enemyWarriorY");
    } else if (lastKnownEnemy.length) {
      let known = lastKnownEnemy[lastKnownEnemy.length - 1];
      
      if (isLocationVisible(observation, owner, known.x, known.y, known.isFlying ? 10 : 3)) {
        lastKnownEnemy.length = lastKnownEnemy.length - 1;

        if (lastKnownEnemy.length) {
          known = lastKnownEnemy[lastKnownEnemy.length - 1];
          army.set("enemyWarriorCount", known.count);
          army.set("enemyWarriorX", known.x);
          army.set("enemyWarriorY", known.y);
        } else {
          army.set("enemyWarriorCount", 0);
          army.clear("enemyWarriorX");
          army.clear("enemyWarriorY");
        }
      } else {
        // We haven't reach the location of last known enemy but we remember the enemy is there
        army.set("enemyWarriorCount", known.count);
        army.set("enemyWarriorX", known.x);
        army.set("enemyWarriorY", known.y);
      }
    } else {
      // No known enemies. Go scouting
      army.set("enemyWarriorCount", 0);
      army.clear("enemyWarriorX");
      army.clear("enemyWarriorY");
    }

    if (enemyUnits.length) {
      const enemyWorker = enemyUnits.find(unit => WORKERS[unit.unitType]);
      const dummyTarget = enemyWorker ? enemyWorker : enemyUnits[0];
      army.set("enemyDummyCount", enemyUnits.length);
      army.set("enemyDummyX", dummyTarget.pos.x);
      army.set("enemyDummyY", dummyTarget.pos.y);
    } else if (isLocationVisible(observation, owner, army.get("enemyDummyX"), army.get("enemyDummyY"), 10)) {
      army.clear("enemyDummyCount");
      army.clear("enemyDummyX");
      army.clear("enemyDummyY");
    }
  }
}

function getSimilarKnownEnemy(enemyUnit, lastKnownEnemy) {
  for (const known of lastKnownEnemy) {
    if ((Math.abs(known.x - enemyUnit.pos.x) <= 10) || (Math.abs(known.y - enemyUnit.pos.y) <= 10)) {
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

function isValidTarget(unit, enemy, combatFlyingUnits) {
  if (!combatFlyingUnits && unit.isFlying) return false;
  if (unit.isHallucination) return false;

  if (unit.unitType === 13) return false; // Ignore changelings

  return (unit.owner === enemy) && (unit.displayType === 1);
}

function isEnemyWarriorWorker(unit, enemy, x, y) {
  if (!WORKERS[unit.unitType]) return false;
  if (!near(unit, x, y, 10)) return false;

  return (unit.owner === enemy) && (unit.displayType === 1);
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

  const armyX = army.get("armyX");
  const armyY = army.get("armyY");
  const armyIsAtOldEnemyLocation = (Math.abs(armyX - oldEnemyX) <= 5) && (Math.abs(armyY - oldEnemyY) <= 5);
  const noEnemiesNearArmy = (!enemyUnits.find(unit => (Math.abs(unit.pos.x - armyX) <= 12) && (Math.abs(unit.pos.y - armyY) <= 12)));
  if (armyIsAtOldEnemyLocation && noEnemiesNearArmy) return true;

  // Otherwise, keep attention to old enemy
  return false;
}

function isLocationVisible(observation, owner, x, y, distance) {
  return !!observation.rawData.units.find(unit => ((unit.owner === owner) && near(unit, x, y, distance)));
}

function near(unit, x, y, distance) {
  return (Math.abs(unit.pos.x - x) <= distance) && (Math.abs(unit.pos.y - y) <= distance);
}

function tangence(baseX, baseY, enemyX, enemyY) {
  return Math.atan2(baseY - enemyY, baseX - enemyX);
}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

function squareDistanceInLine(unitX, unitY, enemyX, enemyY, baseTangence) {
  const uex = (unitX - enemyX);
  const uey = (unitY - enemyY);
  const ued = uex * uex + uey * uey;
  const uec = Math.cos(Math.atan2(uey, uex) - baseTangence);
  return ued * uec * uec * Math.sign(uec);
}
