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
  if (ownMilitaryStrength <= 0.01) {
    const position = random(ALL_POSITIONS);
    const strength = randomStrength();
    add(ownMilitary, position, strength);
    ownMilitaryStrength += strength;
  }

  const ownEconomy = [...EMPTY];
  for (const position of randomPositions(OWN_POSITIONS, randomCount())) {
    add(ownEconomy, position, randomStrength());
  }

  const enemyMilitary = [...EMPTY];
  const enemyWarriors = [];
  let enemyWarriorsCount = randomCount();
  let enemyMilitaryStrength = Math.max(Math.random() * ownMilitaryStrength / 2, 0.01);
  for (const position of randomPositions(ALL_POSITIONS, SIZE * SIZE)) {
    const strength = Math.min(randomStrength(), enemyMilitaryStrength);
    add(enemyMilitary, position, strength);
    enemyWarriors.push({ position: position, strength: strength, distance: distance(position) });
    enemyWarriorsCount--;
    enemyMilitaryStrength -= strength;
    if ((enemyWarriorsCount < 1) || (enemyMilitaryStrength < 0.01)) break;
  }
  enemyWarriors.sort((a, b) => (a.distance - b.distance));
  for (let i = enemyWarriors.length - 1; i > 0; i--) {
    const a = enemyWarriors[i - 1];
    const b = enemyWarriors[i];
    if ((a.distance === b.distance) && (a.strength === b.strength) ) {
      a.strength += b.strength;
      enemyWarriors.splice(i, 1);
    }
  }

  const enemyEconomy = [...EMPTY];
  const enemyBases = [];
  for (const position of randomPositions(ENEMY_POSITIONS, randomCount())) {
    add(enemyEconomy, position, randomStrength());
    enemyBases.push(position);
  }
  enemyBases.sort((a, b) => (distance(a) - distance(b)));

  const deployment = [...EMPTY];
  for (const enemyWarrior of enemyWarriors) {
    add(deployment, enemyWarrior.position, enemyWarrior.strength * 2);
    ownMilitaryStrength -= enemyWarrior.strength * 2;
  }
  if (ownMilitaryStrength >= 0.01) {
    add(deployment, enemyBases, ownMilitaryStrength / enemyBases.length);
  }

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

function distance(a) {
  return (a.x - SIZE) * (a.x - SIZE) + (a.y - SIZE) * (a.y - SIZE);
}
