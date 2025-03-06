import Battle from "./battle.js";
import Units from "../units.js";
import Order from "../order.js";

export default function() {
  for (const warrior of Units.warriors().values()) {
    if (!warrior.isAlive) continue;
    if (warrior.job) continue;
    if (warrior.order.abilityId) continue;

    Order.move(warrior, getClosestFrontlineZone(warrior));
  }
}

function getClosestFrontlineZone(warrior) {
  let closestZone;
  let closestDistance = Infinity;

  for (const battle of Battle.list()) {
    for (const line of battle.lines) {
      const zone = line.zone;
      const distance = calculateSquareDistance(warrior.body, zone);

      if (distance < closestDistance) {
        closestZone = zone;
        closestDistance = distance;
      }
    }
  }

  return closestZone;
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
