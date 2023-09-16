import { SIZE } from "./js/battlefield.js";
import { EMPTY, ALL_POSITIONS, ENEMY_POSITIONS, OWN_POSITIONS, add, random } from "./js/deployment.js";
import MIRRORS from "./js/mirrors.js";

export default function() {
  const ownMilitary = [...EMPTY];
  let ownMilitaryStrength = 0;
  for (const position of randomPositions(ALL_POSITIONS, randomCount())) {
    const strength = randomStrength();
    add(ownMilitary, position, strength);
    ownMilitaryStrength += strength;
  }

  const ownEconomy = [...EMPTY];
  for (const position of randomPositions(OWN_POSITIONS, randomCount())) {
    add(ownEconomy, position, randomStrength());
  }

  const enemyMilitary = [...EMPTY];

  const enemyEconomy = [...EMPTY];
  const enemyBases = randomPositions(ENEMY_POSITIONS, randomCount());
  for (const position of enemyBases) {
    add(enemyEconomy, position, randomStrength());
  }

  const deployment = [...EMPTY];
  add(deployment, enemyBases, ownMilitaryStrength / enemyBases.length);

  const mirror = MIRRORS[Math.floor(MIRRORS.length * Math.random())];

  return {
    input: [...mirror(ownMilitary), ...mirror(ownEconomy), ...mirror(enemyMilitary), ...mirror(enemyEconomy)],
    output: mirror(deployment),
  };
}

function randomCount() {
  return Math.ceil(Math.random() * SIZE);
}

function randomPositions(positions, count) {
  const list = [];
  const spots = {};

  while (list.length < count) {
    const position = random(positions);
    const spot = position.x + position.y * SIZE;

    if (!spots[spot]) {
      list.push(position);
      spots[spot] = true;
    }
  }

  return list;
}

function randomStrength() {
  return Math.max(Math.random(), 0.1);
}
