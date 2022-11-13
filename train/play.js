import Brain from "./brain.js";
import Memory from "./memory.js";
import Probe from "./starcraft/probe.js";
import { map, score } from "./starcraft/game.js";
import { connect, command, observe, protocol, start, step } from "./starcraft/protocol.js";

const probe = new Probe();
const memory = new Memory(10000, 0);
const brain = new Brain(probe, memory, "file:///git/my/norman/train/sandbox/brain");

const stats = {
  matches: 0,
  wins: 0,
  losses: 0,
};

export default async function() {
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
    console.log("____________________");

    for (const unit of protocol.probes()) {
      const probe = new Probe(unit.tag);

      probe.situate(situation);
      probe.motor = await brain.react(probe.sensor);

      console.log("\t", unit.tag);
      probe.print();

      await command(unit.tag, probe.toCommand());
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
