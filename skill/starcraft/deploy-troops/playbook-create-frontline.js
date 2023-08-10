import Battlefield from "./js/battlefield.js";
import MIRRORS from "./js/mirrors.js";

export default function() {
  let battlefield;

  while (!battlefield || !battlefield.ownPositions.base.length || !battlefield.enemyPositions.base.length) {
    battlefield = new Battlefield().generate();
  }

  for (let i = 0; i < 2; i++) {
    const pos = Math.floor(battlefield.ownPositions.base.length * Math.random());
    battlefield.ownMilitary[battlefield.ownPositions.base[pos].spot] = 1;
  }

  const mirror = MIRRORS[Math.floor(MIRRORS.length * Math.random())];

  return {
    input: [...mirror(battlefield.ownMilitary), ...mirror(battlefield.ownEconomy), ...mirror(battlefield.enemyMilitary), ...mirror(battlefield.enemyEconomy)],
    output: mirror(battlefield.deployment),
  };
}
