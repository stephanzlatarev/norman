import Playbook from "../../code/playbook.js";
import { EMPTY, ALL_POSITIONS, ENEMY_POSITIONS, OWN_POSITIONS, add, random } from "./deployment-utils.js";
import display from "./display.js";

const playbook = new Playbook("starcraft/deploy-troops");
const plays = [];

while (plays.length < 5000) {
  const ownMilitary = [...EMPTY];
  add(ownMilitary, random(ALL_POSITIONS), 1);

  const ownEconomy = [...EMPTY];
  const bases = random(OWN_POSITIONS, 3);
  add(ownEconomy, bases, 1);

  const enemyMilitary = [...EMPTY];
  add(enemyMilitary, random(ENEMY_POSITIONS, 3), 1);

  const enemyEconomy = [...EMPTY];
  add(enemyEconomy, random(ENEMY_POSITIONS), 1);

  const deployment = [...EMPTY];
  add(deployment, bases, 1);

  const play = playbook.add([...ownMilitary, ...ownEconomy, ...enemyMilitary, ...enemyEconomy], deployment);
  if (play) plays.push(play);
}

console.log("Saving", plays.length, "plays to playbook");
playbook.save();

console.log();
const play = plays[Math.floor(Math.random() * plays.length)];
display([...play.input, ...play.output], 10, 10);
console.log();
