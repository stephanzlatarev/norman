import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import Depot from "../map/depot.js";
import { PERIMETER_RED } from "../map/perimeter.js";
import { ActiveCount } from "../memo/count.js";
import Enemy from "../memo/enemy.js";

const DARK_TEMPLAR = "DarkTemplar";

export default class AssassinsMission extends Mission {

  run() {
    if (!ActiveCount.DarkTemplar) return;

    for (const unit of Units.warriors().values()) {
      if (!unit.job && (unit.type.name === DARK_TEMPLAR)) {
        new Assassin().assign(unit);
      }
    }
  }

}

class Assassin extends Job {

  constructor() {
    super(DARK_TEMPLAR);

    this.priority = 100;
  }

  execute() {
    const assassin = this.assignee;
    const zone  = assassin.zone;

    if (!assassin.isAlive || !zone) {
      this.close(false);
    } else if (isZoneWithDetection(zone)) {
      escapeZone(assassin, zone);
    } else if (zone.enemies.size) {
      attackZone(assassin, zone);
    } else {
      seekZone(assassin);
    }
  }

}

function isZoneWithDetection(zone) {
  for (const sector of zone.sectors) {
    for (const enemy of sector.threats) {
      if (enemy.type.isDetector) return true;
    }
  }
}

function escapeZone(assassin, zone) {
  let bestExit;
  let bestDistance;
  let bestHasDetection;

  // TODO: Use zone exits instead of neighbors.
  for (const neighbor of zone.neighbors) {
    const distance = calculateSquareDistance(assassin.body, neighbor);

    if (!bestExit) {
      bestExit = neighbor;
      bestDistance = distance;
      bestHasDetection = isZoneWithDetection(neighbor);
    } else if (isZoneWithDetection(neighbor)) {
      if (bestHasDetection && (distance < bestDistance)) {
        bestExit = neighbor;
        bestDistance = distance;
        bestHasDetection = true;
      }
    } else {
      if (bestHasDetection || (distance < bestDistance)) {
        bestExit = neighbor;
        bestDistance = distance;
        bestHasDetection = false;
      }
    }
  }

  Order.move(assassin, bestExit);
}

function attackZone(assassin, zone) {
  let bestTarget;
  let bestHealth = Infinity;

  for (const enemy of zone.enemies) {
    if (!bestTarget || (enemy.armor.total < bestHealth)) {
      bestTarget = enemy;
      bestHealth = enemy.armor.total;
    }
  }

  Order.attack(assassin, bestTarget);
}

function seekZone(assassin) {
  let bestZone = Enemy.base;
  let bestDistance = Infinity;

  for (const zone of Depot.list()) {
    if (zone.perimeterLevel < PERIMETER_RED) continue;
    if (isZoneWithDetection(zone)) continue;

    const distance = calculateSquareDistance(assassin.body, zone);

    if (!bestZone || (distance < bestDistance)) {
      bestZone = zone;
      bestDistance = distance;
    }
  }

  if (bestZone) {
    Order.move(assassin, bestZone);
  }
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
