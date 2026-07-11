import Scan from "./scan.js";
import { Depot, Enemy } from "./imports.js";

export default function(exclude) {
  const enemy = [...Scan.enemy.depots, ...Scan.enemy.production];

  if (!enemy.length && Enemy.base && !exclude.has(Enemy.base)) enemy.push(Enemy.base);

  return enemy
    .filter(zone => !exclude.has(zone))
    .sort((a, b) => (a.distance - b.distance));
}
