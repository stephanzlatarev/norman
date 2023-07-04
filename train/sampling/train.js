import fs from "fs";
import * as tf from "@tensorflow/tfjs-node-gpu";
import Playbook from "../../code/playbook.js";
import mirrors from "./mirrors.js";

const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;
const LEARNING_EPOCHS = 10;
const LEARNING_BATCH = 1024;
const HIDDEN_ACTIVATION_FUNCTION = "relu";
const OUTPUT_ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

async function run(model, playbook, input, output) {
  tf.engine().startScope();

  const info = await model.fit(input, output, { epochs: LEARNING_EPOCHS, batchSize: LEARNING_BATCH, shuffle: true, verbose: false });
  const predictions = await model.predict(input, { batchSize: playbook.input.length }).array();

  const result = {
    loss: info.history.loss.reduce((best, current) => Math.min(current, best), Infinity),
    error: error(playbook.output, predictions),
  };

  tf.engine().endScope();

  return result;
}

function error(output, predictions) {
  let errors = [];

  for (let i = 0; i < predictions.length; i++) {
    let error = 0;

    for (let j = 0; j < predictions[i].length; j++) {
      error = Math.max(error, Math.abs(output[i][j] - predictions[i][j]));
    }

    errors.push(error);
  }
  errors.sort((a, b) => (a - b));

  let pass = 0;
  let fail = 0;
  for (const error of errors) {
    if (error < 0.01) {
      pass++;
    } else if (error > 0.99) {
      fail++;
    }
  }

  return {
    pass: pass / errors.length,
    fail: fail,
    best: errors[0],
    a: errors[Math.floor(errors.length * 0.9)],
    b: errors[Math.floor(errors.length * 0.99)],
    c: errors[Math.floor(errors.length * 0.999)],
    d: errors[Math.floor(errors.length * 0.9999)],
    worst: errors[errors.length - 1],
  };
}

function create() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [INPUT_SIZE], units: 400, activation: HIDDEN_ACTIVATION_FUNCTION }));
  model.add(tf.layers.dense({ units: 400, activation: HIDDEN_ACTIVATION_FUNCTION }));
  model.add(tf.layers.dense({ units: OUTPUT_SIZE, activation: OUTPUT_ACTIVATION_FUNCTION }));
  model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
  return model;
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

async function save(model, file) {
  await model.save({
    save: function(model) {
      const copy = {...model, weightData: []};
      copy.weightData = Array.from(new Uint8Array(model.weightData));
      fs.writeFileSync(file, JSON.stringify(copy));
    }
  });
}

function show(iteration, result) {
  const line = [new Date().toISOString().split("T")[1].split(".")[0], iteration];

  const error = result.error;
  line.push("best: " + error.best.toFixed(5));
  line.push(error.a.toFixed(2));
  line.push(error.b.toFixed(2));
  line.push(error.c.toFixed(2));
  line.push(error.d.toFixed(2));
  line.push("worst: " + error.worst.toFixed(5));
  line.push("pass: " + (error.pass * 100).toFixed(2) + "%");
  line.push("fail: " + error.fail);

  line.push("loss: " + result.loss);

  console.log(line.join("\t"));
}

async function train() {
  const playbook = new Playbook("starcraft/deploy-troops").mirror(mirrors).read();
  console.log("Training with playbook of", playbook.input.length, "plays");

  const file = "./train/sampling/brain.tf";
  const model = fs.existsSync(file) ? await load(file) : create();
  const input = tf.tensor(playbook.input, [playbook.input.length, INPUT_SIZE]);
  const output = tf.tensor(playbook.output, [playbook.output.length, OUTPUT_SIZE]);

  let iteration = 0;
  while (++iteration > 0) {
    const attempt = await run(model, playbook, input, output);

    show(iteration, attempt);

    await save(model, file);
  }
}

train();
