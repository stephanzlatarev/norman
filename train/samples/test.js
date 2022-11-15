import Brain from "../brain.js";
import Probe from "../starcraft/probe.js";

let testing;

export default async function(skill) {
  const probe = new Probe();
  const brain = new Brain(probe, null, "file:///git/my/norman/train/sandbox/brain/" + skill);

  let good = 0;
  let bad = 0;

  init();

  while (testing) {
    const input = sensor();
    const output = await brain.react(input);

    if (output[0] > 0.6) {
      // CORRECT - Attack
      good++;
    } else {
      // INCORRECT
      bad++;

      console.log(" === INCORRECT ===", output, "|", bad, "vs", good, "|", (bad * 100 / (good + bad)).toFixed(2) + "%");
      probe.sensor = input;
      probe.motor = output;
      probe.print();

      await sleep(10);
    }
  }
}

function sensor() {
  let data = [];
  for (let i = 0; i < 32; i++) data[i] = Math.floor(Math.random() * 2);

  let enemy = 16 + Math.floor(Math.random * 8);
  data[enemy] = 1;

  return data;
}

function init() {
  testing = true;

  process.stdin.on("keypress", (_, key) => {
    if (key.name === "escape") {
      testing = false;
    }
  });
  console.log("Press Esc to leave");
}

async function sleep(millis) {
  await new Promise(r => setTimeout(r, millis));
}
