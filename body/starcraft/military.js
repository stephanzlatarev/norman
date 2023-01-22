
const STALK_RANGE_SQUARED = 81; // Squared range for stalking enemies

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
  const armyUnits = observation.ownUnits.filter(unit => (unit.unitType === 73) || (unit.unitType === 74));

  army.set("baseX", homebase.get("x"));
  army.set("baseY", homebase.get("y"));
  army.set("warriorCount", armyUnits.length);

  if (army.get("enemyCount") && armyUnits.length) {
    const leaderTag = army.get("leaderTag");
    let leader = leaderTag ? armyUnits.find(unit => (unit.tag === leaderTag)) : null;

    if (!leader) {
      const enemyX = army.get("enemyX");
      const enemyY = army.get("enemyY");
      const baseX = homebase.get("x");
      const baseY = homebase.get("y");
      const baseTangence = tangence(baseX, baseY, enemyX, enemyY);

      for (const unit of armyUnits) {
        unit.squareDistanceToEnemy = squareDistance(unit.pos.x, unit.pos.y, enemyX, enemyY, baseTangence);
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

    army.set("leaderTag", leader.tag);
    army.set("tag", armyUnits.map(unit => unit.tag));
    army.set("armyCount", armyUnits.filter(unit => near(unit, leader.pos.x, leader.pos.y, 10)).length);
    army.set("armyX", leader.pos.x);
    army.set("armyY", leader.pos.y);
  } else {
    army.set("armyCount", 0);
    army.set("tag", []);
    army.clear("leaderTag");
    army.clear("armyX");
    army.clear("armyY");
  }
}

function observeEnemy(game, army, homebase, observation) {
  const owner = game.get("owner");
  const enemy = game.get("enemy");
  const homebaseX = homebase.get("x");
  const homebaseY = homebase.get("y");

  const enemyUnits = observation.rawData.units.filter(unit => (!unit.isFlying && (unit.owner === enemy)));
  enemyUnits.sort((a, b) => {
    const da = (a.pos.x - homebaseX) * (a.pos.x - homebaseX) + (a.pos.y - homebaseY) * (a.pos.y - homebaseY);
    const db = (b.pos.x - homebaseX) * (b.pos.x - homebaseX) + (b.pos.y - homebaseY) * (b.pos.y - homebaseY);
    return da - db;
  });
  const enemyUnit = enemyUnits.length ? enemyUnits[0] : null;

  if (enemyUnit) {
    const oldEnemyCount = army.get("enemyCount");
    army.set("enemyCount", Math.max(enemyUnits.length, oldEnemyCount ? oldEnemyCount : 0));
    army.set("enemyX", enemyUnit.pos.x);
    army.set("enemyY", enemyUnit.pos.y);
  } else if (isLocationVisible(observation, owner, army.get("enemyX"), army.get("enemyY"))) {
    army.set("enemyCount", 0);
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

function squareDistance(unitX, unitY, enemyX, enemyY, baseTangence) {
  const uex = (unitX - enemyX);
  const uey = (unitY - enemyY);
  const ued = uex * uex + uey * uey;
  const uec = Math.cos(Math.atan2(uey, uex) - baseTangence);
  return ued * uec * uec * Math.sign(uec);
}
