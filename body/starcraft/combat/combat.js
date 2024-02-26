import { createAttackCommand, createMoveCommand } from "./command.js";

let mode;
let base;
let rally;

export default class Combat {

  run(commands, units, supply) {
    if (units.size) {
      identifyBase(units);

      const warriors = listWarriors(units);

      if (warriors.length) {
        const buildings = listBuildings(units);
        const enemy = findEnemy(units, buildings, getIsInAttackMode(supply));

        if (enemy) {
          for (const warrior of warriors) {
            createAttackCommand(commands, warrior, enemy.body);
          }

          rally = { x: enemy.body.x, y: enemy.body.y };
        } else {
          for (const warrior of warriors) {
            createMoveCommand(commands, warrior, rally);
          }
        }
      }
    }
  }

}

function getIsInAttackMode(supply) {
  if (supply < 160) {
    mode = null;
  } else if (supply >= 195) {
    mode = "attack";
  }

  return (mode === "attack");
}

function identifyBase(units) {
  if (!base) {
    for (const unit of units.values()) {
      if (unit.isOwn && !unit.isWarrior) {
        base = unit;
        rally = base.body;
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
function findEnemy(units, buildings, isInAttackMode) {
  if (base) {
    let bestTarget;
    let bestDistance = Infinity;

    for (const unit of units.values()) {
      if (unit.isEnemy && (isInAttackMode || isCloseToBuildings(unit, buildings))) {
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
    if ((Math.abs(enemy.body.x - building.body.x) < 15) && (Math.abs(enemy.body.y - building.body.y) < 15)) {
      return true;
    }
  }
}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
