
const ENEMY_ALERT_SQUARED = 40*40; // Squared distance which raises alert for enemies
const STALK_RANGE_SQUARED = 14*14; // Squared range for stalking enemies - just outside range of tanks in siege mode

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
  const armyUnits = observation.ownUnits.filter(unit => (unit.unitType === 73) || (unit.unitType === 74) || (unit.unitType === 77));
  const baseX = homebase.get("x");
  const baseY = homebase.get("y");

  army.set("baseX", baseX);
  army.set("baseY", baseY);
  army.set("warriorCount", armyUnits.length);

  if (army.get("enemyCount") && armyUnits.length) {
    const leaderTag = army.get("leaderTag");
    let leader = leaderTag ? armyUnits.find(unit => (unit.tag === leaderTag)) : null;

    if (!leader) {
      const enemyX = army.get("enemyX");
      const enemyY = army.get("enemyY");
      const baseTangence = tangence(baseX, baseY, enemyX, enemyY);

      for (const unit of armyUnits) {
        unit.squareDistanceToEnemy = squareDistanceInLine(unit.pos.x, unit.pos.y, enemyX, enemyY, baseTangence);
      }

      const order = armyUnits.sort((a, b) => (a.squareDistanceToEnemy - b.squareDistanceToEnemy));

      for (const unit of order) {
        if (unit.squareDistanceToEnemy <= STALK_RANGE_SQUARED) {
          leader = unit;
        } else {
          break;
        }
      }
    }

    if (!leader) {
      leader = armyUnits[0];
    }

    // Only sentries count as energy units. We want to know the max energy level a unit in the army pack has
    const armyPackUnits = armyUnits.filter(unit => near(unit, leader.pos.x, leader.pos.y, 10));
    let armyEnergy = 0;
    let countEnergyUnits = 0;
    for (const unit of armyPackUnits) {
      if (unit.unitType === 77) {
        countEnergyUnits++;
        armyEnergy = Math.max(armyEnergy, unit.energyMax ? Math.floor(100 * unit.energy / unit.energyMax) : 100);
      }
    }
    if (!countEnergyUnits) armyEnergy = 100;

    army.set("leaderTag", leader.tag);
    army.set("tag", armyUnits.map(unit => unit.tag));
    army.set("armyCount", armyPackUnits.length);
    army.set("armyEnergy", armyEnergy);
    army.set("armyX", leader.pos.x);
    army.set("armyY", leader.pos.y);

    const guardTag = army.get("guardTag");
    let guard = guardTag ? armyUnits.find(unit => (unit.tag === guardTag)) : null;

    if (!guard || (distance(guard.pos.x, guard.pos.y, baseX, baseY) > ENEMY_ALERT_SQUARED)) {
      guard = armyUnits.find(unit => (distance(unit.pos.x, unit.pos.y, baseX, baseY) < ENEMY_ALERT_SQUARED));
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
  const oldEnemyX = army.get("enemyX");
  const oldEnemyY = army.get("enemyY");

  const enemyUnits = observation.rawData.units.find(unit => ((unit.unitType === 74) && (unit.owner === owner))) // One stalker allows to target flying units
    ? observation.rawData.units.filter(unit => (unit.owner === enemy))
    : observation.rawData.units.filter(unit => (!unit.isFlying && (unit.owner === enemy)));
  for (const unit of enemyUnits) unit.distanceToHomebase = distance(unit.pos.x, unit.pos.y, homebaseX, homebaseY);
  enemyUnits.sort((a, b) => (a.distanceToHomebase - b.distanceToHomebase));
  const enemyUnit = enemyUnits.length ? enemyUnits[0] : null;

  if (enemyUnit) {
    const oldEnemyCount = army.get("enemyCount");
    army.set("enemyCount", Math.max(enemyUnits.length, oldEnemyCount ? oldEnemyCount : 0));

    if (!oldEnemyX || !oldEnemyY || (enemyUnit.distanceToHomebase < distance(oldEnemyX, oldEnemyY, homebaseX, homebaseY) - STALK_RANGE_SQUARED)) {
      // Switch attention to enemy which is closest to homebase
      army.set("enemyAlert", distance(enemyUnit.pos.x, enemyUnit.pos.y, homebaseX, homebaseY) <= ENEMY_ALERT_SQUARED);
      army.set("enemyX", enemyUnit.pos.x);
      army.set("enemyY", enemyUnit.pos.y);
    }
  } else if (isLocationVisible(observation, owner, oldEnemyX, oldEnemyY)) {
    army.set("enemyCount", 0);
    army.clear("enemyAlert");
    army.clear("enemyX");
    army.clear("enemyY");
  }
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
