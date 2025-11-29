import Scan from "./scan.js";
import { Depot, Enemy } from "./imports.js";

export default function(exclude) {
  const enemy = [...Scan.enemy.depots, ...Scan.enemy.production];

  if (!enemy.length && !exclude.has(Enemy.base)) enemy.push(Enemy.base);

  return enemy
    .filter(zone => !exclude.has(zone))
    .map(zone => ({ zone, distance: calculateSquareDistance(zone, Depot.home) }))
    .sort((a, b) => (b.distance - a.distance))
    .map(item => item.zone);
}

function calculateSquareDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return dx * dx + dy * dy;
}
