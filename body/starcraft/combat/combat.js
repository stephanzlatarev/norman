import command from "./command.js";

let base;

export default class Combat {

  run(commands, units) {
    if (units.size) {
      identifyBase(units);

      const buildings = listBuildings(units);
      const enemy = findEnemy(units, buildings);

      if (enemy) {
        const warriors = listWarriors(units);

        if (warriors.length) {
          command(commands, warriors, enemy);
        }
      }
    }
  }

}

function identifyBase(units) {
  if (!base) {
    for (const unit of units.values()) {
      if (unit.isOwn && !unit.isWarrior) {
        base = unit;
        return;
      }
    }
  }
}

function listWarriors(units) {
  const warriors = [];

  for (const unit of units.values()) {
    if (unit.isWarrior) {
      warriors.push(unit);
    }
  }

  return warriors;
}

function listBuildings(units) {
  const buildings = [];

  for (const unit of units.values()) {
    if (unit.isOwn && !unit.isWarrior) {
      buildings.push(unit);
    }
  }

  return buildings;
}

// Finds one enemy that is close to our buildings
function findEnemy(units, buildings) {
  if (base) {
    let bestTarget;
    let bestDistance = Infinity;

    for (const unit of units.values()) {
      if (unit.isEnemy && isCloseToBuildings(unit, buildings)) {
        const distance = calculateDistance(unit.body, base.body);

        if (distance < bestDistance) {
          bestTarget = unit;
          bestDistance = distance;
        }
      }
    }

    return bestTarget;
  }
}

function isCloseToBuildings(enemy, buildings) {
  for (const building of buildings) {
    if ((Math.abs(enemy.body.x - building.body.x) < 20) && (Math.abs(enemy.body.y - building.body.y) < 20)) {
      return true;
    }
  }
}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
