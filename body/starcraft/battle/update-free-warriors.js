import Battle from "./battle.js";
import Units from "../units.js";
import Order from "../order.js";

export default function() {
  for (const warrior of Units.warriors().values()) {
    if (!warrior.isAlive) continue;
    if (!warrior.type.movementSpeed) continue;
    if (warrior.job) continue;
    if (warrior.order.abilityId) continue;

    Order.move(warrior, getClosestBattleRally(warrior));
  }
}

function getClosestBattleRally(warrior) {
  let closestRally;
  let closestDistance = Infinity;

  for (const battle of Battle.list()) {
    const distance = calculateSquareDistance(warrior.body, battle.rally);

    if (distance < closestDistance) {
      closestRally = battle.rally;
      closestDistance = distance;
    }
  }

  return closestRally;
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
