import { EMPTY, ALL_POSITIONS, ENEMY_POSITIONS, OWN_POSITIONS, add, random } from "./js/deployment.js";
import MIRRORS from "./js/mirrors.js";

export default function() {
  const ownMilitary = [...EMPTY];
  add(ownMilitary, random(ALL_POSITIONS), 1);

  const ownEconomy = [...EMPTY];
  add(ownEconomy, random(OWN_POSITIONS), 1);

  const enemyMilitary = [...EMPTY];

  const enemyEconomy = [...EMPTY];
  const enemyBase = random(ENEMY_POSITIONS);
  const enemyStrength = Math.max(Math.random(), 0.1);
  add(enemyEconomy, enemyBase, enemyStrength);

  const deployment = [...EMPTY];
  add(deployment, enemyBase, 1);

  const mirror = MIRRORS[Math.floor(MIRRORS.length * Math.random())];

  return {
    input: [...mirror(ownMilitary), ...mirror(ownEconomy), ...mirror(enemyMilitary), ...mirror(enemyEconomy)],
    output: mirror(deployment),
  };
}
