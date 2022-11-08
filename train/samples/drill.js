import fs from "fs";
import Brain from "../brain.js";

export default async function() {
  const samples = JSON.parse(fs.readFileSync("./train/sandbox/samples/test.json").toString());

  const INPUT_SIZE = samples[0].input.length;
  const OUTPUT_SIZE = samples[0].output.length;

  // TODO: Choose epochs and batch size based on number of samples and their size
  const brain = new Brain(INPUT_SIZE, OUTPUT_SIZE, 100, 50);

  for (const sample of samples) brain.learn(sample.input, sample.output, 1);

  while (true) {
    await brain.run(5000);
    await brain.save("file:///git/my/norman/train/sandbox/brain");
  }
}
