import fs from "fs";
import * as tf from "@tensorflow/tfjs-node-gpu";
import Playbook from "../../code/playbook.js";
import mirrors from "./mirrors.js";
import display from "./display.js";

const INPUT_SIZE = 400;
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

async function run(model, playbook, input) {
  tf.engine().startScope();

  const predictions = await model.predict(input, { batchSize: playbook.input.length }).array();

  const result = compare(playbook.input, playbook.output, predictions);

  tf.engine().endScope();

  return result;
}

function compare(input, output, predictions) {
  let result = [];

  for (let i = 0; i < predictions.length; i++) {
    let error = 0;

    for (let j = 0; j < predictions[i].length; j++) {
      error = Math.max(error, Math.abs(output[i][j] - predictions[i][j]));
    }

    result.push({
      input: input[i],
      output: output[i],
      prediction: predictions[i],
      error: error,
      pass: (error < 0.01),
      distance: Infinity,
    });
  }

  return result;
}

async function load(file) {
  const model = await tf.loadLayersModel({
    load: function() {
      const model = JSON.parse(fs.readFileSync(file));
      model.weightData = new Uint8Array(model.weightData).buffer;
      return model;
    }
  });
  model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
  return model;
}

function show(title, result) {
  const line = [title];

  line.push("samples: " + result.length);

  let pass = 0;
  for (const one of result) {
    if (one.pass) pass++;
  }
  line.push("pass: " + (pass * 100 / result.length).toFixed(2) + "%");

  console.log(line.join("\t"));
}

async function test(title, model, playbook) {
  const input = tf.tensor(playbook.input, [playbook.input.length, INPUT_SIZE]);
  const result = await run(model, playbook, input);

  show(title, result);

  return result;
}

async function go() {
  const file = "./train/sampling/brain.tf";
  const model = await load(file);
  const samples = [];
  const sorted = [];

  model.summary();

  await test("All:\t", model, new Playbook("starcraft/deploy-troops").mirror(mirrors).read());

  for (let i = 0; i < mirrors.length; i++) {
    const result = await test("Mirror: " + i, model, new Playbook("starcraft/deploy-troops").mirror([mirrors[i]]).read());
    samples.push([...result]);
    result.sort((a, b) => (b.error - a.error));
    sorted.push(result);
  }

  for (const list of sorted) {
    for (const sample of list) {
      if (!sample.pass) {
        display([...sample.input, ...sample.output, ...sample.prediction], 10, 10);
      }
    }
  }

//  const mirrorOfWorstCase = sorted.reduce((mirror, samples, index, array) => ((samples[0].error > array[mirror][0].error) ? index : mirror));
  sorted.sort((a, b) => (b[0].error - a[0].error));

  const worst = sorted[0][0];
  console.log();
  console.log("Worst case error:", worst.error);
  display([...worst.input, ...worst.output, ...worst.prediction], 10, 10);

  console.log();
  console.log("Closest samples of same mirror by error:");
  for (let i = 1; i <= 5; i++) {
    const sample = sorted[0][i];
    console.log("Error:", sample.error);
    display([...sample.input, ...sample.output, ...sample.prediction], 10, 10);
  }

  for (const samples of sorted) {
    for (const sample of samples) {
      sample.distance = (sample !== worst) ? distance(sample.input, worst.input) : Infinity;
    }
    samples.sort((a, b) => (a.distance - b.distance));
  }

  console.log();
  console.log("Closest samples of same mirror by input:");
  for (let i = 1; i <= 5; i++) {
    const sample = sorted[0][i];
    console.log("Error:", sample.error, "Distance:", sample.distance);
    display([...sample.input, ...sample.output, ...sample.prediction], 10, 10);
  }
}

function distance(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    d += Math.abs(a[i] - b[i]);
  }
  return d;
}

go();
