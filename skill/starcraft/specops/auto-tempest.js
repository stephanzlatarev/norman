import { ActiveCount, Depot, Order, Units, Zone } from "./imports.js";

let target = null;

export default function() {
  if (ActiveCount.Tempest === 0) return;

  if (!target || !target.isAlive || !target.isVisible) {
    target = findClosestEnemy();
  }
  if (!target) return;

  for (const unit of Units.warriors().values()) {
    if (unit.type.name === "Tempest") controlTempest(unit);
  }
}

function controlTempest(tempest) {
  if ((tempest.weapon.cooldown > 3) && (tempest.weapon.cooldown < tempest.type.weaponCooldown - 3)) {
    Order.move(tempest, Depot.home);
  } else {
    Order.attack(tempest, target);
  }
}

function findClosestEnemy() {
  for (const zone of Zone.list()) {
    for (const sector of zone.sectors) {
      for (const enemy of sector.threats) {
        if (enemy.type.isWarrior) return enemy;
      }
    }
  }
}
