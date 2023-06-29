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

async function train() {
  const file = "./train/sampling/brain.tf";
  const model = await load(file);
  const results = [];

  for (let i = 0; i < mirrors.length; i++) {
    results.push(await test("Mirror: " + i, model, new Playbook("starcraft/deploy-troops").mirror([mirrors[i]]).read()));
  }

  await test("All:", model, new Playbook("starcraft/deploy-troops").mirror(mirrors).read());

  for (let i = 0; i < results[0].length; i++) {
//    let isInteresting = results[0][i].pass;
//    if (isInteresting) {
//      for (let j = 1; j < 8; j++) {
//        if (results[j][i].pass) {
//          isInteresting = false;
//          break;
//        }
//      }
//    }
    let isInteresting = false;
    for (let j = 0; j < 8; j++) {
      if (results[j][i].error > 0.9) {
        isInteresting = true;
        break;
      }
    }
    if (isInteresting) {
      console.log("Sample #", i);
      for (let j = 0; j < 8; j++) {
        console.log("Mirror #", j);
        display([...results[j][i].input, ...results[j][i].output, ...results[j][i].prediction], 10, 10);
      }
      break;
    }
  }
}

train();
