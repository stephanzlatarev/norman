import { ActiveCount, Depot, Order, Units, Zone } from "./imports.js";

export default function() {
  if (ActiveCount.Oracle === 0) return;

  for (const unit of Units.warriors().values()) {
    if (unit.type.name === "Oracle") controlOracle(unit);
  }
}

function controlOracle(oracle) {
  if (!oracle.zone || areAirShootingEnemiesInZone(oracle.zone)) return Order.move(oracle, Depot.home);

  if (oracle.order.abilityId === 23) return;

  const target = findWorkerInZone(oracle.zone) || findLightWarriorInZone(oracle.zone)
    || findTargetWorker() || findTargetLightWarrior();

  if (target) {
    if (calculateSquaredDistance(oracle.body, target.body) < 16) {
      if (oracle.isPulsarBeamOn) {
        Order.attack(oracle, target);
      } else if (oracle.energy >= 75) {
        new Order(oracle, 2375).accept(() => !!oracle.isPulsarBeamOn);
      }
    } else {
      if (oracle.isPulsarBeamOn && (target.zone !== oracle.zone)) {
        new Order(oracle, 2376).accept(() => !oracle.isPulsarBeamOn);
      } else {
        Order.move(oracle, target);
      }
    }
  } else {
    Order.move(oracle, Depot.home);
  }
}

function areAirShootingEnemiesInZone(zone) {
  for (const enemy of zone.enemies) {
    if (enemy.type.damageAir) {
      return true;
    }
  }
}

function findWorkerInZone(zone) {
  for (const unit of zone.enemies) {
    if (unit.type.isWorker) {
      return unit;
    }
  }
}

function findLightWarriorInZone(zone) {
  for (const unit of zone.enemies) {
    if (unit.type.name === "Zergling") {
      return unit;
    }
  }
}

function findTargetWorker() {
  for (const zone of Zone.list()) {
    if (!areAirShootingEnemiesInZone(zone)) {
      const worker = findWorkerInZone(zone);
      if (worker) return worker;
    }
  }
}

function findTargetLightWarrior() {
  for (const zone of Zone.list()) {
    if (!areAirShootingEnemiesInZone(zone)) {
      const warrior = findLightWarriorInZone(zone);
      if (warrior) return warrior;
    }
  }
}

function calculateSquaredDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return (dx * dx) + (dy * dy);
}
