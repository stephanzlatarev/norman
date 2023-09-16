import { EMPTY, ALL_POSITIONS, ENEMY_POSITIONS, OWN_POSITIONS, add, random } from "./js/deployment.js";
import MIRRORS from "./js/mirrors.js";

export default function() {
  const ownEconomy = [...EMPTY];
  const ownEconomyCount = Math.random() * 10;
  for (let i = 0; i < ownEconomyCount; i++) {
    add(ownEconomy, random(OWN_POSITIONS), randomStrength());
  }

  const enemyEconomy = [...EMPTY];
  const enemyEconomyCount = Math.random() * 10;
  for (let i = 0; i < enemyEconomyCount; i++) {
    add(enemyEconomy, random(ENEMY_POSITIONS), randomStrength());
  }

  const enemies = [];
  const enemyMilitary = [...EMPTY];
  const enemyMilitaryCount = Math.random() * 10;
  for (let i = 0; i < enemyMilitaryCount; i++) {
    const enemy = { position: random(ALL_POSITIONS), strength: randomStrength() };
    add(enemyMilitary, enemy.position, enemy.strength);
    enemies.push(enemy);
  }
  enemies.sort((a, b) => (distance(a.position) - distance(b.position)));

  let ownMilitaryStrength = 0;
  const ownMilitary = [...EMPTY];
  const ownMilitaryCount = Math.random() * 10;
  for (let i = 0; i < ownMilitaryCount; i++) {
    const strength = randomStrength();
    ownMilitaryStrength += strength;
    add(ownMilitary, random(ALL_POSITIONS), strength);
  }

  const deployment = [...EMPTY];
  while ((ownMilitaryStrength >= 0.1) && enemies.length) {
    const enemy = enemies[0];
    const counterStrength = enemy.strength * 2;
    add(deployment, enemy.position, counterStrength);
    enemies.splice(0, 1);
    ownMilitaryStrength -= counterStrength;
  }

  const mirror = MIRRORS[Math.floor(MIRRORS.length * Math.random())];

  return {
    input: [...mirror(ownMilitary), ...mirror(ownEconomy), ...mirror(enemyMilitary), ...mirror(enemyEconomy)],
    output: mirror(deployment),
  };
}

function randomStrength() {
  return Math.max(Math.random(), 0.1);
}

function distance(a) {
  return (a.x - 10) * (a.x - 10) + (a.y - 10) * (a.y - 10);
}
