import { ActiveCount, Depot, Order, Units, Zone } from "./imports.js";

const currentTargets = new Set();

export default function() {
  if (ActiveCount.Oracle === 0) return;

  currentTargets.clear();

  for (const unit of Units.warriors().values()) {
    if (unit.type.name === "Oracle") controlOracle(unit);
  }
}

function controlOracle(oracle) {
  if (!oracle.zone || areAirShootingEnemiesInZone(oracle.zone)) return Order.move(oracle, Depot.home);

  if (oracle.order.abilityId === 23) return;

  const target = findClosestTargetInZone(oracle, isWorker) || findClosestTargetInZone(oracle, isLightWarrior) || findTargetWorker() || findTargetLightWarrior();

  if (target) {
    currentTargets.add(target);

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
  for (const sector of zone.sectors) {
    for (const threat of sector.threats) {
      if (threat.type.damageAir) {
        return true;
      }
    }
  }
}

function isLightWarrior(unit) {
  return unit.type.name === "Zergling";
}

function isWorker(unit) {
  return unit.type.isWorker;
}

function findAnyTargetInZone(zone, filter) {
  for (const unit of zone.enemies) {
    if (filter(unit) && !currentTargets.has(unit)) {
      return unit;
    }
  }
}

function findClosestTargetInZone(oracle, filter) {
  let closestTarget = null;
  let closestDistance = Infinity;

  for (const unit of oracle.zone.enemies) {
    if (filter(unit) && !currentTargets.has(unit)) {
      const distance = calculateSquaredDistance(unit.body, oracle.body);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestTarget = unit;
      }
    }
  }

  return closestTarget;
}

function findTargetWorker() {
  for (const zone of Zone.list()) {
    if (zone.enemies.size && !areAirShootingEnemiesInZone(zone)) {
      const worker = findAnyTargetInZone(zone, isWorker);
      if (worker) return worker;
    }
  }
}

function findTargetLightWarrior() {
  for (const zone of Zone.list()) {
    if (zone.enemies.size && !areAirShootingEnemiesInZone(zone)) {
      const warrior = findAnyTargetInZone(zone, isLightWarrior);
      if (warrior) return warrior;
    }
  }
}

function calculateSquaredDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return (dx * dx) + (dy * dy);
}
