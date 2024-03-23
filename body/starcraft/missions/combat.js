import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import { ActiveCount } from "../memo/count.js";
import Enemy from "../memo/enemy.js";
import Resources from "../memo/resources.js";

const DEFENSE_SQUARE_DISTANCE = 15 * 15;

let mode;
let ownBase;

export default class Combat extends Mission {

  run() {
    if (!findOwnBase()) return;
    if (ActiveCount.Zealot + ActiveCount.Stalker + ActiveCount.Sentry + ActiveCount.Immortal === 0) return;

    const enemy = findClosestEnemy() || Enemy.base;
    if (!enemy) return;

    if (isInAttackMode()) {
      return attack(enemy);
    } else if (enemy === Enemy.base) {
      // Must be in attack mode to attack enemy base
      return;
    }

    const { closestBuilding, closestSquareDistance } = findClosestBuilding(enemy);

    if (closestSquareDistance < DEFENSE_SQUARE_DISTANCE) {
      return attack(enemy);
    }

    return rally(closestBuilding);
  }

}

function attack(target) {
  const pos = target.body || target;

  let observer;
  let leader;
  let leaderDistance = Infinity;

  for (const warrior of Units.warriors().values()) {
    if (warrior.type.name === "Observer") {
      observer = warrior;
    } else {
      orderAttack(warrior, pos);

      const distance = Math.abs(warrior.body.x - pos.x) + Math.abs(warrior.body.y - pos.y);
      if (distance < leaderDistance) {
        leader = warrior;
        leaderDistance = distance;
      }
    }
  }

  if (observer && leader) {
    orderMove(observer, leader.body);
  }
}

function rally(target) {
  const pos = target.body || target;

  for (const warrior of Units.warriors().values()) {
    orderMove(warrior, pos);
  }
}

function isInAttackMode() {
  if (Resources.supplyUsed < 160) {
    mode = null;
  } else if (Resources.supplyUsed >= 195) {
    mode = "attack";
  }

  return (mode === "attack");
}

function findOwnBase() {
  if (!ownBase) {
    for (const building of Units.buildings().values()) {
      ownBase = building;
      return;
    }
  }

  return ownBase;
}

// Finds the closest enemy that is close to our buildings
function findClosestEnemy() {
  let closestEnemy;
  let closestSquareDistance = Infinity;

  for (const enemy of Units.enemies().values()) {
    const squareDistance = calculateSquareDistance(enemy.body, ownBase.body);

    if (squareDistance < closestSquareDistance) {
      closestEnemy = enemy;
      closestSquareDistance = squareDistance;
    }
  }

  return closestEnemy;
}

function findClosestBuilding(enemy) {
  let closestBuilding;
  let closestSquareDistance = Infinity;

  for (const building of Units.buildings().values()) {
    const squareDistance = calculateSquareDistance(building.body, enemy.body);

    if (squareDistance < closestSquareDistance) {
      closestBuilding = building;
      closestSquareDistance = squareDistance;
    }
  }

  return { closestBuilding, closestSquareDistance };
}

function orderAttack(warrior, pos) {
  if (!warrior || !warrior.order || !warrior.body || !pos) return;

  if (
    (warrior.order.abilityId !== 23) ||
    (warrior.order.targetWorldSpacePos && !isSamePosition(warrior.order.targetWorldSpacePos, pos)) ||
    (warrior.order.targetUnitTag && isFarFrom(warrior.body, pos))
  ) {
    new Order(warrior, 23, pos);
  }
}

function orderMove(warrior, pos) {
  if (!warrior || !warrior.order || !warrior.body || !pos) return;
  if (isCloseTo(warrior.body, pos)) return;

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos);
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) <= 3) && (Math.abs(a.y - b.y) <= 3);
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) <= 10) && (Math.abs(a.y - b.y) <= 10);
}

function isFarFrom(a, b) {
  return (Math.abs(a.x - b.x) >= 20) && (Math.abs(a.y - b.y) >= 20);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
