import { ActiveCount, Depot, Order, Units, Zone } from "./imports.js";

const SQUARE_SIGHT = 12 * 12;

// All Tempest units move as a group with synchronized weapons
export default function() {
  if (ActiveCount.Tempest === 0) return;

  const tempests = getTempests();

  let target = null;
  let rally = Depot.home;

  if (!areThreatened(tempests)) {
    target = selectTarget(tempests);

    if (target && !target.isValidShootingTarget(true)) {
      // Go closer to target to get it in sight
      rally = target.body;
      target = null;
    }
  }

  for (const tempest of tempests) {
    if (target) {
      Order.attack(tempest, target);
    } else {
      Order.move(tempest, rally);
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

function areThreatened(tempests) {
  for (const tempest of tempests) {
    const sectors = [tempest.sector, ...tempest.sector.neighbors];

    for (const sector of sectors) {
      for (const enemy of sector.threats) {
        if (enemy.isTargetInFireRange(tempest, 1)) return true;
      }
    }
  }
}

function selectTarget(tempests) {
  const targets = new Set();

  for (const zone of Zone.list()) {
    for (const sector of zone.sectors) {
      for (const enemy of sector.threats) {
        if (enemy.type.isWarrior && enemy.isValidShootingTarget()) {
          targets.add(enemy);
        }
      }
    }

    // If there are targets in this zone then select from it
    if (targets.size) break;
  }

  // When there are no targets then return no target
  if (!targets.size) return;

  let bestTarget;
  let bestDistance = Infinity;

  for (const target of targets) {
    for (const tempest of tempests) {
      const distance = calculateSquaredDistance(target.body, tempest.body);

      if ((distance < SQUARE_SIGHT) && !target.isValidShootingTarget(true)) {
        target.sector.untrackUnit(target);
        targets.delete(target);
      } else if (!bestTarget || (distance < bestDistance)) {
        bestTarget = target;
        bestDistance = distance;
      }
    }
  }

  return bestTarget;
}

function calculateSquaredDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return (dx * dx) + (dy * dy);
}
