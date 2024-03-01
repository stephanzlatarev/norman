import { createAttackCommand, createMoveCommand } from "./command.js";

const DEFENSE_SQUARE_DISTANCE = 15 * 15;

let mode;
let ownBase;
let enemyBase;

export default class Combat {

  run(commands, units, model, supply) {
    if (!units.size) return;
    if (!findOwnBase(units)) return;

    const warriors = listWarriors(units);
    if (!warriors.length) return;

    const enemy = findClosestEnemy(units) || findEnemyBase(model);
    if (!enemy) return;

    if (isInAttackMode(supply)) {
      return attack(commands, warriors, enemy);
    } else if (enemy === enemyBase) {
      // Must be in attack mode to attack enemy base
      return;
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

function findOwnBase(units) {
  if (!ownBase) {
    for (const unit of units.values()) {
      if (unit.isOwn && !unit.isWarrior) {
        ownBase = unit;
        break;
      }
    }
  }

  return ownBase;
}

function findEnemyBase(model) {
  if (!enemyBase) {
    const enemy = model.get("Enemy");

    enemyBase = {
      body: {
        x: enemy.get("baseX"),
        y: enemy.get("baseY"),
      }
    };
  }

  return enemyBase;
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
      const squareDistance = calculateSquareDistance(unit.body, ownBase.body);

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
