
const ENEMY_ALERT_SQUARED = 40*40; // Squared distance which raises alert for enemies
const STALK_RANGE_SQUARED = 14*14; // Squared range for stalking enemies - just outside range of tanks in siege mode

const WARRIORS = {
  10: "mothership",
  73: "zealot",
  74: "stalker",
  77: "sentry",
  78: "phoenix",
  79: "carrier",
  80: "voidray",
  82: "observer",
};
const LEADERS = {
  10: "mothership",
  73: "zealot",
  74: "stalker",
};
const USES_ENERGY = {
  10: "mothership",
  77: "sentry",
};
const CAN_HIT_AIR = {
  10: "mothership",
  74: "stalker",
  77: "sentry",
  78: "phoenix",
  79: "carrier",
  80: "voidray",
};

// The units that can't fight my army
const DUMMY_TARGETS = {
  // Terran
  18: "command center",
  19: "supply depot",
  20: "refinery",
  21: "barracks",
  28: "starport",
  36: "flying command center",
  45: "scv",
  47: "supply depot lowered",
  268: "mule",

  // Protoss
  59: "nexus",
  60: "pylon",
  61: "assimilator",
  62: "gateway",
  63: "forge",
  64: "beacon",
  67: "stargate",
  71: "robotics",
  72: "cybernetics",
  82: "observer",
  84: "probe",

  // Zerg
  86: "hatchery",
  87: "creep tumor",
  88: "extractor",
  89: "spawning pool",
  97: "roach warren",
  100: "lair",
  101: "hive",
  103: "egg",
  104: "drone",
  106: "overlord",
  151: "larva",
};

const LIGHT_WARRIORS = {
  105: "zergling",
};

const STATIONARY_WARRIORS = {
  66: "photon cannon",
};

export function observeMilitary(node, client, observation) {
  const homebase = node.get("homebase");
  const army = node.memory.get(node.path + "/army");

  if (!army.get("code")) {
    army.set("code", "body/starcraft/unit/army").set("channel", client).set("game", node).set("orders", []);
  }

  if (homebase) {
    observeEnemy(node, army, homebase, observation);
    observeArmy(army, homebase, observation);
  }
}

function observeArmy(army, homebase, observation) {
  const armyUnits = observation.ownUnits.filter(unit => WARRIORS[unit.unitType]);
  army.set("tag", armyUnits.map(unit => unit.tag));

  const baseX = homebase.get("x");
  const baseY = homebase.get("y");

  army.set("baseX", baseX);
  army.set("baseY", baseY);
  army.set("warriorCount", armyUnits.length);
  army.set("totalCount", observation.playerCommon.foodUsed);

  const leaderUnits = armyUnits.filter(unit => LEADERS[unit.unitType]);

  if (leaderUnits.length && (army.get("enemyWarriorCount") || army.get("enemyDummyCount"))) {
    const leaderTag = army.get("leaderTag");
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

    const armyPackUnits = armyUnits.filter(unit => near(unit, leader.pos.x, leader.pos.y, 10));

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

    army.set("leaderTag", leader.tag);
    army.set("engagedCount", armyPackUnits.filter(unit => (unit.engagedTargetTag !== "0")).length);
    army.set("armyCount", armyPackUnits.length);
    army.set("armyEnergy", armyEnergy);
    army.set("armyX", leader.pos.x);
    army.set("armyY", leader.pos.y);

    const guardTag = army.get("guardTag");
    let guard = guardTag ? leaderUnits.find(unit => (unit.tag === guardTag)) : null;

    if (!guard || (distance(guard.pos.x, guard.pos.y, baseX, baseY) > ENEMY_ALERT_SQUARED)) {
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
    army.set("tag", []);
    army.clear("leaderTag");
    army.clear("engagedCount");
    army.clear("armyEnergy");
    army.clear("armyX");
    army.clear("armyY");
    army.clear("guardTag");
    army.clear("guardX");
    army.clear("guardY");
  }
}

function observeEnemy(game, army, homebase, observation) {
  const owner = game.get("owner");
  const enemy = game.get("enemy");
  const homebaseX = homebase.get("x");
  const homebaseY = homebase.get("y");
  const oldEnemyWarriorX = army.get("enemyWarriorX");
  const oldEnemyWarriorY = army.get("enemyWarriorY");

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

    const newEnemyCount = enemyWarriors.length - (countUnits(enemyWarriors, LIGHT_WARRIORS) / 2);
    
    army.set("enemyWarriorCount", Math.max(newEnemyCount, oldEnemyCount));

    if (shouldSwitchAttention(oldEnemyWarriorX, oldEnemyWarriorY, enemyUnit, enemyWarriors, homebaseX, homebaseY, army)) {
      // Switch attention to enemy which is closest to homebase
      army.set("enemyAlert", (enemyUnit.distanceToHomebase <= ENEMY_ALERT_SQUARED) && !STATIONARY_WARRIORS[enemyUnit.unitType]);
      army.set("enemyWarriorX", enemyUnit.pos.x);
      army.set("enemyWarriorY", enemyUnit.pos.y);
    }

    army.clear("enemyDummyCount");
    army.clear("enemyDummyX");
    army.clear("enemyDummyY");
  } else {
    // No enemy warrior is in sight. Focus on dummy targets if any.

    if (isLocationVisible(observation, owner, oldEnemyWarriorX, oldEnemyWarriorY) || enemyUnits.length) {
      army.set("enemyWarriorCount", 0);
      army.clear("enemyAlert");
      army.clear("enemyWarriorX");
      army.clear("enemyWarriorY");
    }

    if (enemyUnits.length) {
      const dummyTarget = enemyUnits[0];
      army.set("enemyDummyCount", enemyUnits.length);
      army.set("enemyDummyX", dummyTarget.pos.x);
      army.set("enemyDummyY", dummyTarget.pos.y);
    } else if (isLocationVisible(observation, owner, army.get("enemyDummyX"), army.get("enemyDummyY"))) {
      army.clear("enemyDummyCount");
      army.clear("enemyDummyX");
      army.clear("enemyDummyY");
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

  if (unit.unitType === 13) return false; // Ignore changelings

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

function isLocationVisible(observation, owner, x, y) {
  return !!observation.rawData.units.find(unit => ((unit.owner === owner) && near(unit, x, y, 3)));
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
