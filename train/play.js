import Brain from "./brain.js";
import { map, pov, score } from "./starcraft/game.js";
import monitor from "./starcraft/monitor.js";
import { command, connect, observe, start, step, protocol } from "./starcraft/protocol.js";

const brain = new Brain(130, 2, 1, 1);
const stats = {
  matches: 0,
  wins: 0,
  losses: 0,
};

export default async function() {
  await brain.load("file:///git/my/norman/train/sandbox/brain/model.json");

  await connect();

  while (true) {
    await start();
    await step();

    while (await play(brain));
  }
}

async function play() {
  let context = await observe();
  let situation = map(context);
  let playScore;

  while (typeof(playScore) !== "number") {
    for (const unit of protocol.probes()) {
      const input = pov(situation, unit.tag)
      const output = await brain.answer(input);

      monitor(input, output);

      await command(unit.tag, output);
    }

    await step();

    context = await observe();
    if (!context) break;

    situation = map(context);
    playScore = score(context);
  }

  stats.matches++;

  if (context) {
    if (score(context) > 0) {
      stats.wins++;
    } else {
      stats.losses++;
    }
  }

  console.log("Matches:", stats.matches, "wins:", stats.wins, "lossess:", stats.losses, "win rate:", (stats.wins * 100 / stats.matches).toFixed(2) + "%");
}
