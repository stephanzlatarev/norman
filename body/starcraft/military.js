
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
  const armyUnits = observation.rawData.units.filter(unit => (unit.unitType === 73));

  if (army.get("enemyCount") && armyUnits.length) {
    const homebaseX = homebase.get("x");
    const homebaseY = homebase.get("y");
    const midX = (homebaseX + army.get("enemyX") * 3) / 4;
    const midY = (homebaseY + army.get("enemyY") * 3) / 4;

    armyUnits.sort((a, b) => {
      const da = (a.pos.x - midX) * (a.pos.x - midX) + (a.pos.y - midY) * (a.pos.y - midY);
      const db = (b.pos.x - midX) * (b.pos.x - midX) + (b.pos.y - midY) * (b.pos.y - midY);
      return da - db;
    });
    const midUnit = armyUnits[0];

    army.set("tag", armyUnits.map(unit => unit.tag));
    army.set("armyCount", armyUnits.filter(unit => near(unit, midUnit.pos.x, midUnit.pos.y, 18)).length);
    army.set("armyX", midUnit.pos.x);
    army.set("armyY", midUnit.pos.y);
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

  const enemyUnits = observation.rawData.units.filter(unit => (!unit.isFlying && unit.owner && (unit.owner === enemy)));
  enemyUnits.sort((a, b) => {
    const da = (a.pos.x - homebaseX) * (a.pos.x - homebaseX) + (a.pos.y - homebaseY) * (a.pos.y - homebaseY);
    const db = (b.pos.x - homebaseX) * (b.pos.x - homebaseX) + (b.pos.y - homebaseY) * (b.pos.y - homebaseY);
    return da - db;
  });
  const enemyUnit = enemyUnits.length ? enemyUnits[0] : null;

  if (enemyUnit) {
    army.set("enemyCount", enemyUnits.length);
    army.set("enemyX", enemyUnit.pos.x);
    army.set("enemyY", enemyUnit.pos.y);
  } else if (isLocationVisible(observation, owner, army.get("enemyX"), army.get("enemyY"))) {
    army.set("enemyCount", 0);
    army.clear("enemyX");
    army.clear("enemyY");
  }
}

function isLocationVisible(observation, owner, x, y) {
  return !!observation.rawData.units.find(unit => ((unit.owner === owner) && near(unit, x, y, 5)));
}

function near(unit, x, y, distance) {
  return (Math.abs(unit.pos.x - x) <= distance) && (Math.abs(unit.pos.y - y) <= distance);
}
