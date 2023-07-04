import Playbook from "../../code/playbook.js";
import Battlefield from "./battlefield.js";

const playbook = new Playbook("starcraft/deploy-troops");
const battlefields = [];

while (battlefields.length < 5000) {
  const battlefield = new Battlefield().generate();

  if (!battlefield.ownPositions.base.length || !battlefield.enemyPositions.base.length) continue;

  for (let i = 0; i < 2; i++) {
    const pos = Math.floor(battlefield.ownPositions.base.length * Math.random());
    battlefield.ownMilitary[battlefield.ownPositions.base[pos].spot] = 1;
  }

  const ok = playbook.add([...battlefield.ownMilitary, ...battlefield.ownEconomy, ...battlefield.enemyMilitary, ...battlefield.enemyEconomy], battlefield.deployment);
  if (ok) battlefields.push(battlefield);
}

console.log("Saving", battlefields.length, "plays to playbook");
playbook.save();

const sample = Math.floor(Math.random() * battlefields.length);
console.log("Sample:", sample);
battlefields[sample].display();
console.log();
