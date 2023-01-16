
export function observeMilitary(node, observation) {
  observeArmy(node, observation);
  observeEnemy(node, observation);
}

function observeArmy(node, observation) {
  const armyUnits = observation.rawData.units.filter(unit => (unit.unitType === 73));

  if (armyUnits.length) {
    armyUnits.sort((a, b) => (a.pos.x - b.pos.x));
    const midX = armyUnits[Math.floor(armyUnits.length / 2)].pos.x;

    armyUnits.sort((a, b) => (a.pos.y - b.pos.y));
    const midY = armyUnits[Math.floor(armyUnits.length / 2)].pos.x;

    armyUnits.sort((a, b) => {
      const da = (a.pos.x - midX) * (a.pos.x - midX) + (a.pos.y - midY) * (a.pos.y - midY);
      const db = (b.pos.x - midX) * (b.pos.x - midX) + (b.pos.y - midY) * (b.pos.y - midY);
      return da - db;
    });
    const midUnit = armyUnits[Math.floor(armyUnits.length / 2)];

    node.set("armyX", midUnit.pos.x);
    node.set("armyY", midUnit.pos.y);

    const army = armyUnits.filter(unit => near(unit, midUnit.pos.x, midUnit.pos.y));
    node.set("armyCount", army.length);
  } else {
    node.set("armyCount", 0);
    node.clear("armyX");
    node.clear("armyX");
  }
}

function observeEnemy(node, observation) {
  const homebase = node.get("homebase");

  if (!homebase) return;

  const owner = node.get("owner");
  const enemy = node.get("enemy");
  const homebaseX = homebase.get("x");
  const homebaseY = homebase.get("y");

  const enemyUnits = observation.rawData.units.filter(unit => (!unit.isFlying && unit.owner && (unit.owner === enemy)));
  enemyUnits.sort((a, b) => {
    const da = (a.pos.x - homebaseX) * (a.pos.x - homebaseX) + (a.pos.y - homebaseY) * (a.pos.y - homebaseY);
    const db = (b.pos.x - homebaseX) * (b.pos.x - homebaseX) + (b.pos.y - homebaseY) * (b.pos.y - homebaseY);
    return da - db;
  });
  const enemyUnit = enemyUnits.length ? enemyUnits[0] : null;

  node.set("enemyCount", enemyUnits.length);

  if (enemyUnit) {
    node.set("enemyX", enemyUnit.pos.x);
    node.set("enemyY", enemyUnit.pos.y);
  } else if (isLocationVisible(observation, owner, node.get("enemyX"), node.get("enemyY"))) {
    node.clear("enemyX");
    node.clear("enemyY");
  }
}

function isLocationVisible(observation, owner, x, y) {
  return !!observation.rawData.units.find(unit => ((unit.owner === owner) && near(unit, x, y)));
}

function near(unit, x, y) {
  return (Math.abs(unit.pos.x - x) <= 5) && (Math.abs(unit.pos.y - y) <= 5);
}
