
export function observeMilitary(node, client, observation) {
  const homebase = node.get("homebase");
  const army = node.memory.get(node.path + "/army");

  if (!army.get("code")) {
    army.set("code", "body/starcraft/unit/army").set("channel", client).set("game", node).set("orders", []);
  }

  if (homebase) {
    observeEnemy(node, army, homebase, observation);
    observeArmy(army, observation);
  }
}

function observeArmy(army, observation) {
  const armyUnits = observation.ownUnits.filter(unit => (unit.unitType === 73));

  if (army.get("enemyCount") && armyUnits.length) {
    const leaderTag = army.get("leaderTag");
    let leader = leaderTag ? armyUnits.find(unit => (unit.tag === leaderTag)) : null;

    if (!leader) {
      const enemyX = army.set("enemyX");
      const enemyY = army.set("enemyY");
      const candidates = armyUnits.filter(unit => !near(unit, enemyX, enemyY, 24));
      candidates.sort((a, b) => {
        const da = (a.pos.x - enemyX) * (a.pos.x - enemyX) + (a.pos.y - enemyY) * (a.pos.y - enemyY);
        const db = (b.pos.x - enemyX) * (b.pos.x - enemyX) + (b.pos.y - enemyY) * (b.pos.y - enemyY);
        return da - db;
      });
      leader = candidates[0];
    }

    army.set("leaderTag", leader.tag);
    army.set("tag", armyUnits.map(unit => unit.tag));
    army.set("armyCount", armyUnits.filter(unit => near(unit, leader.pos.x, leader.pos.y, 10) || isFighting(unit)).length);
    army.set("armyX", leader.pos.x);
    army.set("armyY", leader.pos.y);
  } else {
    army.set("armyCount", 0);
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

function isFighting(unit) {
  if (!unit.orders.length) return false;

  const ability = unit.orders[0].abilityId;
  return ((ability === 3674) || (ability === 23) || (ability === 2048));
}

function isLocationVisible(observation, owner, x, y) {
  return !!observation.rawData.units.find(unit => ((unit.owner === owner) && near(unit, x, y, 5)));
}

function near(unit, x, y, distance) {
  return (Math.abs(unit.pos.x - x) <= distance) && (Math.abs(unit.pos.y - y) <= distance);
}
