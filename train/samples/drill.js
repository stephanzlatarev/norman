import fs from "fs";
import Brain from "../brain.js";
import Memory from "../memory.js";
import Probe from "../starcraft/probe.js";

export default async function() {
  const samples = JSON.parse(fs.readFileSync("./train/sandbox/samples/probe.json").toString());

  const probe = new Probe();
  const memory = new Memory(10000, 0);
  const brain = new Brain(probe, memory, "file:///git/my/norman/train/sandbox/brain");

  for (const sample of samples) {
    probe.sensor = sample.sensor;
    probe.motor = sample.motor;

    do {
      memory.add(probe.sensor, probe.motor, 1);

      probe.spin();
    } while (probe.spinning);
  }

  while (true) {
    await brain.learn(5000);
  }
}
