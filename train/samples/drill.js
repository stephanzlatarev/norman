import fs from "fs";
import Brain from "../brain.js";
import { spin, show } from "../starcraft/game.js";

export default async function() {
  const samples = JSON.parse(fs.readFileSync("./train/sandbox/samples/test.json").toString());

  const INPUT_SIZE = samples[0].input.length;
  const OUTPUT_SIZE = samples[0].output.length;

  // TODO: Choose epochs and batch size based on number of samples and their size
  const brain = new Brain(INPUT_SIZE, OUTPUT_SIZE, 100, 50);
  await brain.load("file:///git/my/norman/train/sandbox/brain/model.json");

  for (const sample of samples) {
    for (let angle = 0; angle < 8; angle++) {
      brain.learn(spin(sample.input, angle, false), sample.output, 1);
      brain.learn(spin(sample.input, angle, true), sample.output, 1);
    }
  }

  while (true) {
    await brain.run(5000);
    await brain.save("file:///git/my/norman/train/sandbox/brain");
  }
}
