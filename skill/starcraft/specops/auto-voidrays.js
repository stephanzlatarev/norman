import { ActiveCount, Order, Units, Zone } from "./imports.js";

let target = null;
 
export default function() {
  if (ActiveCount.VoidRay === 0) return;

  if (!target || !target.isAlive || !target.isVisible) {
    target = findClosestFlyingEnemy();
  }

  // TODO: Go back home instead of staying idle
  if (!target) return;

  for (const unit of Units.warriors().values()) {
    if (unit.type.name === "VoidRay") Order.attack(unit, target);
  }
}

// TODO: When there are no unprotected flyers target tumors or help battles
function findClosestFlyingEnemy() {
  let bestZone = null;
  let bestPerimeter = Infinity;

  // Zones are ordered by perimeter level
  for (const zone of Zone.list()) {
    for (const sector of zone.sectors) {
      for (const enemy of sector.threats) {
        if (enemy.body.isFlying) {
          return enemy;
        }
      }
    }
  }
}
