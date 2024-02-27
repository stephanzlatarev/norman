import { createAttackCommand, createMoveCommand } from "./command.js";

const DEFENSE_SQUARE_DISTANCE = 15 * 15;

let mode;
let base;

export default class Combat {

  run(commands, units, supply) {
    if (!units.size) return;
    if (!findBase(units)) return;

    const warriors = listWarriors(units);
    if (!warriors.length) return;

    const enemy = findClosestEnemy(units);
    if (!enemy) return;

    if (isInAttackMode(supply)) {
      return attack(commands, warriors, enemy);
    }

    const { closestBuilding, closestSquareDistance } = findClosestBuilding(units, enemy);

    if (closestSquareDistance < DEFENSE_SQUARE_DISTANCE) {
      return attack(commands, warriors, enemy);
    }

    return rally(commands, warriors, closestBuilding);
  }

}

function attack(commands, warriors, target) {
  for (const warrior of warriors) {
    createAttackCommand(commands, warrior, target.body);
  }
}

function rally(commands, warriors, target) {
  for (const warrior of warriors) {
    createMoveCommand(commands, warrior, target.body);
  }
}

function isInAttackMode(supply) {
  if (supply < 160) {
    mode = null;
  } else if (supply >= 195) {
    mode = "attack";
  }

  return (mode === "attack");
}

function findBase(units) {
  if (!base) {
    for (const unit of units.values()) {
      if (unit.isOwn && !unit.isWarrior) {
        base = unit;
        break;
      }
    }
  }

  return base;
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

// Finds the closest enemy that is close to our buildings
function findClosestEnemy(units) {
  let closestEnemy;
  let closestSquareDistance = Infinity;

  for (const unit of units.values()) {
    if (unit.isEnemy) {
      const squareDistance = calculateSquareDistance(unit.body, base.body);

      if (squareDistance < closestSquareDistance) {
        closestEnemy = unit;
        closestSquareDistance = squareDistance;
      }
    }
  }

  return closestEnemy;
}

function findClosestBuilding(units, enemy) {
  let closestBuilding;
  let closestSquareDistance = Infinity;

  for (const unit of units.values()) {
    if (unit.isOwn && !unit.isWarrior) {
      const squareDistance = calculateSquareDistance(unit.body, enemy.body);

      if (squareDistance < closestSquareDistance) {
        closestBuilding = unit;
        closestSquareDistance = squareDistance;
      }
    }
  }

  return { closestBuilding, closestSquareDistance };
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
