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

let speed = 50;
let pause = false;

export default async function() {
  init();
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
    if (pause) {
      console.log("____________________");
      for (const unit of situation) {
        console.log(unit.tag, "\t", unit.owner, "\t", unit.x.toFixed(2), "\t", unit.y.toFixed(2));
      }
    }

    for (const unit of protocol.probes()) {
      const probe = new Probe(unit.tag);

      probe.situate(situation);
      probe.motor = await brain.react(probe.sensor);

      if (pause) {
        console.log("\t", unit.tag);
        probe.print();
      }

      await command(unit.tag, probe.toCommand());
    }

    while (pause) await sleep(1000);

    await sleep(speed);
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

async function sleep(millis) {
  await new Promise(r => setTimeout(r, millis));
}

function init() {
  process.stdin.on("keypress", (_, key) => {
    if (key.name === "escape") {
      process.exit(0);
    } else if (key.name === "left") {
      if (speed > 100) {
        pause = true;
      } else {
        speed += 10;
      }
    } else if (key.name === "right") {
      speed -= 10;
      if (speed < 0) {
        speed = 0;
      }
      pause = false;
    } else {
      pause = !pause;
    }
  });
  console.log("Press → to speed up");
  console.log("Press ← to speed down");
  console.log("Press p to pause");
  console.log("Press Esc to leave");
}
