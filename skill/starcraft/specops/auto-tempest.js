import { ActiveCount, Depot, Order, Resources, Units, Zone } from "./imports.js";

const SQUARE_RANGE = 81; // This is optimized for a Queen target

let target = null;

// All Tempest units move in a clump with synchronized weapons
export default function() {
  if (ActiveCount.Tempest === 0) return;

  const tempests = getTempests();
  const center = calculateCenter(tempests);

  target = updateTarget(center);

  const command = calculateCommand(center);

  for (const tempest of tempests) {
    if (command.action === "attack") {
      Order.attack(tempest, command.target);
    } else {
      Order.move(tempest, command.target);
    }
  }
}

function getTempests() {
  const tempests = [];

  for (const unit of Units.warriors().values()) {
    if (unit.type.name === "Tempest") {
      tempests.push(unit);
    }
  }

  return tempests;
}

function updateTarget(pos) {
  const closestEnemy = findClosestEnemy();

  if (!closestEnemy) return;
  const distanceClosestEnemy = calculateSquaredDistance(pos, closestEnemy.body);
  if ((distanceClosestEnemy < SQUARE_RANGE) && !closestEnemy.isValidShootingTarget(true)) {
    closestEnemy.sector.untrackUnit(closestEnemy);
    return;
  }

  if (!target) return closestEnemy;
  const distanceTarget = calculateSquaredDistance(pos, target.body);
  if ((distanceTarget < SQUARE_RANGE) && !target.isValidShootingTarget(true)) {
    target.sector.untrackUnit(target);
    return closestEnemy;
  }

  if (target === closestEnemy) return closestEnemy;
  if (target.zone !== closestEnemy.zone) return closestEnemy;
  if (!target.isValidShootingTarget()) return closestEnemy;

  return (distanceTarget <= distanceClosestEnemy) ? target : closestEnemy;
}

function calculateCommand(center) {
  if (!target) return { action: "move", target: Depot.home };

  const squareDistance = calculateSquaredDistance(center, target.body);

  if (squareDistance < SQUARE_RANGE) return { action: "move", target: Depot.home };
  if (!target.isValidShootingTarget(true)) return { action: "move", target: target.body };

  return { action: "attack", target };
}

function findClosestEnemy() {
  for (const zone of Zone.list()) {
    for (const sector of zone.sectors) {
      for (const enemy of sector.threats) {
        if (enemy.type.isWarrior && enemy.isValidShootingTarget()) return enemy;
      }
    }
  }
}

function calculateCenter(units) {
  let x = 0;
  let y = 0;
  let count = 0;

  for (const unit of units) {
    x += unit.body.x;
    y += unit.body.y;
    count++;
  }

  return {
    x: x / count,
    y: y / count,
  };
}

function calculateSquaredDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return (dx * dx) + (dy * dy);
}
