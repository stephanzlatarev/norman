import fs from "fs";
import Brain from "../brain.js";
import Memory from "../memory.js";
import Probe from "../starcraft/probe.js";

export default async function() {
  const samples = JSON.parse(fs.readFileSync("./train/sandbox/samples/probe.json").toString());

  const probe = new Probe();
  const memory = new Memory(10000, 0);
  const brain = new Brain(probe, memory, "file:///git/my/norman/train/sandbox/brain");

  const performance = [];
  const ordered = [];
  let index = 0;
  let lossSum = 0;
  let lossCount = 0;

  for (const sample of samples) {
    probe.sensor = sample.sensor;
    probe.motor = sample.motor;

    do {
      const sampling = {
        label: index + "/" + probe.spinning,
        input: [...probe.sensor],
        output: [...probe.motor],
        response: [],
        loss: 1,
      };

      const check = await test(brain, sampling);
      sampling.response = check.response;
      sampling.loss = check.loss;

      performance.push(sampling);
      if (!probe.spinning) ordered.push(sampling);

      lossSum += sampling.loss;
      lossCount++;

      probe.spin();
    } while (probe.spinning);

    index++;
  }

  performance.sort((a, b) => (a.loss > b.loss ? -1 : 1));

  console.log();
  console.log("=== First samples ===");
  for (let i = 0; i < 5; i++) highlight(probe, ordered[i]);

  console.log();
  console.log("=== Best performs ===");
  for (let i = performance.length - 1; i > performance.length - 6; i--) highlight(probe, performance[i]);

  console.log();
  console.log("=== Worst performs ===");
  for (let i = 5; i >= 0; i--) highlight(probe, performance[i]);

  console.log();
  console.log("Overall loss over", lossCount, "samples:", (lossSum / lossCount));
  console.log();
}

async function test(brain, test) {
  const response = await brain.react(test.input);

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
    response: [...response],
    loss: loss / response.length,
  };
}

async function highlight(probe, sampling) {
  console.log("=========", sampling.label, "\tLOSS:", sampling.loss);

  probe.sensor = sampling.input;
  probe.motor = sampling.response;
  probe.print();

  console.log("EXPECTED:", sampling.output);
  console.log("ACTUAL  :", sampling.response);
}
