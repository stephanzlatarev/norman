import Playbook from "../../code/playbook.js";
import { EMPTY, ALL_POSITIONS, ENEMY_POSITIONS, OWN_POSITIONS, add, random } from "./deployment-utils.js";
import display from "./display.js";

const playbook = new Playbook("starcraft/deploy-troops");
const plays = [];

while (plays.length < 5000) {
  const ownMilitary = [...EMPTY];
  add(ownMilitary, random(ALL_POSITIONS), 1);

  const ownEconomy = [...EMPTY];
  add(ownEconomy, random(OWN_POSITIONS), 1);

  const enemyMilitary = [...EMPTY];

  const enemyEconomy = [...EMPTY];
  const enemyBase = random(ENEMY_POSITIONS);
  add(enemyEconomy, enemyBase, 1);

  const deployment = [...EMPTY];
  add(deployment, enemyBase, 1);

  const play = playbook.add([...ownMilitary, ...ownEconomy, ...enemyMilitary, ...enemyEconomy], deployment);
  if (play) plays.push(play);
}

console.log("Saving", plays.length, "plays to playbook");
playbook.save();

console.log();
const play = plays[Math.floor(Math.random() * plays.length)];
display([...play.input, ...play.output], 10, 10);
console.log();
