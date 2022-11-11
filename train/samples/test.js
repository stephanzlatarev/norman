import fs from "fs";
import Brain from "../brain.js";
import { spinCommand } from "../starcraft/commands.js";
import { spinPov } from "../starcraft/game.js";
import monitor from "../starcraft/monitor.js";

export default async function() {
  const samples = JSON.parse(fs.readFileSync("./train/sandbox/samples/test.json").toString());

  const INPUT_SIZE = samples[0].input.length;
  const OUTPUT_SIZE = samples[0].output.length;

  // TODO: Choose epochs and batch size based on number of samples and their size
  const brain = new Brain(INPUT_SIZE, OUTPUT_SIZE, 10, samples.length * 8 * 2);
  await brain.load("file:///git/my/norman/train/sandbox/brain/model.json");

  const performance = [];
  let lossSum = 0;
  let lossCount = 0;

  for (let index = 0; index < samples.length; index++) {
    for (let angle = 0; angle < 8; angle++) {
      for (let flip = 0; flip <= 1; flip++) {
        const sample = samples[index];
        const sampling = {
          label: index + "/" + angle + "/" + flip,
          input: spinPov(sample.input, angle, !!flip),
          output: spinCommand(sample.output, angle, !!flip),
          response: [],
          loss: 1,
        };

        const check = await test(brain, sampling);
        sampling.response = check.response;
        sampling.loss = check.loss;

        performance.push(sampling);

        lossSum += sampling.loss;
        lossCount++;
      }
    }
  }

  performance.sort((a, b) => (a.loss > b.loss ? -1 : 1));

  console.log();
  console.log("=== Best performs ===");
  for (let i = performance.length - 1; i > performance.length - 6; i--) highlight(performance[i]);

  console.log();
  console.log("=== Worst performs ===");
  for (let i = 5; i >= 0; i--) highlight(performance[i]);

  console.log();
  console.log("Overall loss over", lossCount, "samples:", (lossSum / lossCount));
  console.log();
}

async function test(brain, test) {
  const response = await brain.answer(test.input);

  let loss = 0;
  for (let i = 0; i < response.length; i++) {
    const error = Math.abs(response[i] - test.output[i]);
    if (error <= 0.5) {
      loss += error * error;
    } else {
      loss += (1 - error) * (1 - error);
    }
  }

  return {
    response: response,
    loss: loss / response.length,
  };
}

async function highlight(sampling) {
  console.log("=========", sampling.label, "\tLOSS:", sampling.loss);
  monitor(sampling.input, sampling.response);
  console.log("EXPECTED:", sampling.output);
  console.log("ACTUAL  :", sampling.response);
}
