import { SIZE } from "./js/battlefield.js";
import { EMPTY, ALL_POSITIONS, ENEMY_POSITIONS, OWN_POSITIONS, add, random } from "./js/deployment.js";
import MIRRORS from "./js/mirrors.js";

const OVERWHELM_FACTOR = 2;

export default function() {
  const ownEconomy = [...EMPTY];
  const ownEconomyCount = Math.random() * SIZE;
  for (let i = 0; i < ownEconomyCount; i++) {
    add(ownEconomy, random(OWN_POSITIONS), randomStrength());
  }

  const enemyEconomy = [...EMPTY];
  const enemyEconomyCount = Math.random() * SIZE;
  for (let i = 0; i < enemyEconomyCount; i++) {
    add(enemyEconomy, random(ENEMY_POSITIONS), randomStrength());
  }

  let enemyMilitaryStrength = 0;
  const enemies = [];
  const enemyMilitary = [...EMPTY];
  for (const position of randomPositions(ALL_POSITIONS, randomCount())) {
    const strength = Math.min(randomStrength(), 1/ OVERWHELM_FACTOR);
    const enemy = { position: position, strength: strength };
    enemyMilitaryStrength += strength;
    add(enemyMilitary, enemy.position, enemy.strength);
    enemies.push(enemy);
  }
  enemies.sort((a, b) => (distance(a.position) - distance(b.position)));

  let ownMilitaryStrength = 0;
  const warriors = [];
  const ownMilitary = [...EMPTY];
  for (const position of randomPositions(ALL_POSITIONS, Math.max(randomCount(), Math.ceil(enemyMilitaryStrength * OVERWHELM_FACTOR)))) {
    const strength = randomStrength();
    const warrior = { position: position, strength: strength };
    ownMilitaryStrength += strength;
    add(ownMilitary, position, strength);
    warriors.push(warrior);
  }

  let militaryStrengthDifference = enemyMilitaryStrength * OVERWHELM_FACTOR - ownMilitaryStrength;
  while (militaryStrengthDifference >= 0.1) {
    for (const warrior of warriors) {
      if (warrior.strength < 1.0) {
        warrior.strength += 0.1;
        add(ownMilitary, warrior, 0.1);
        militaryStrengthDifference -= 0.1;
        if (militaryStrengthDifference < 0.1) break;
      }
    }
  }

  const deployment = [...EMPTY];
  for (const enemy of enemies) {
    add(deployment, enemy.position, enemy.strength * OVERWHELM_FACTOR);
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
