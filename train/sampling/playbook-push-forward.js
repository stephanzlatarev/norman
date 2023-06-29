import Playbook from "../../code/playbook.js";
import { EMPTY, ENEMY_POSITIONS, OWN_POSITIONS, add, random } from "./deployment-utils.js";
import display from "./display.js";

const playbook = new Playbook("starcraft/deploy-troops");
const plays = [];

// TODO: Make sure weak enemy positions are attacked only when they are at the front line

while (plays.length < 5000) {
  const ownMilitary = [...EMPTY];
  add(ownMilitary, random(OWN_POSITIONS, 3), 1);

  const ownEconomy = [...EMPTY];
  const bases = random(OWN_POSITIONS, 3);
  add(ownEconomy, bases, 1);

  const enemyMilitary = [...EMPTY];
  const enemies = random(ENEMY_POSITIONS, 3);
  add(enemyMilitary, enemies[0], 0.5);
  add(enemyMilitary, enemies[1], 1);
  add(enemyMilitary, enemies[2], 1);

  const enemyEconomy = [...EMPTY];
  add(enemyEconomy, random(ENEMY_POSITIONS), 1);

  const deployment = [...EMPTY];
  add(deployment, enemies[0], 1);
  add(deployment, bases, 0.6);

  const play = playbook.add([...ownMilitary, ...ownEconomy, ...enemyMilitary, ...enemyEconomy], deployment);
  if (play) plays.push(play);
}

console.log("Saving", plays.length, "plays to playbook");
playbook.save();

console.log();
const play = plays[Math.floor(Math.random() * plays.length)];
display([...play.input, ...play.output], 10, 10);
console.log();
