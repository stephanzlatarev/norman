import fs from "fs";
import Brain from "../brain.js";
import Memory from "../memory.js";
import Probe from "../starcraft/probe.js";

let drilling = false;

export default async function(skill) {
  if (!skill) return;

  const samples = JSON.parse(fs.readFileSync("./train/sandbox/samples/" + skill + ".json").toString());

  const probe = new Probe();
  const memory = new Memory(10000, 0);
  const brain = new Brain(probe, memory, "file:///git/my/norman/train/sandbox/brain/" + skill);

  init();

  for (const sample of samples) {
    probe.sensor = sample.sensor;
    probe.motor = sample.motor;

    do {
      memory.add(probe.sensor, probe.motor, 1);

      probe.spin();
    } while (probe.spinning);
  }

  while (drilling) {
    await brain.learn(5000);
  }
}

function init() {
  drilling = true;

  process.stdin.on("keypress", (_, key) => {
    if (key.name === "escape") {
      drilling = false;
    }
  });
  console.log("Press Esc to leave");
}
