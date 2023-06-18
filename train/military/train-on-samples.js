import fs from "fs";
import * as tf from "@tensorflow/tfjs-node-gpu";

const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;
const LEARNING_EPOCHS = 100;
const LEARNING_BATCH = 1024;
const ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

function prepareSamples(file) {
  const samples = { input: [], output: [] };
  const knowns = {};
  let deployment;
  const lines = fs.readFileSync(file, "utf8").split("\r\n");

  for (const line of lines) {
    if (!line || !line.length) continue;
    const input = simplify(JSON.parse(line));
    if (!hasTroops(input)) continue;
    if (!deployment) deployment = top(input.slice(300));
    const hash = JSON.stringify(input);

    if (!knowns[hash]) {
      samples.input.push(input);
      samples.output.push(deployment);
      knowns[hash] = true;
    }
  }

  return samples;
}

function hasTroops(array) {
  for (let i = 0; i < 100; i++) {
    if (array[i]) return true;
  }
}

function simplify(array) {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.ceil(array[i] * 10) / 10;
  }

  return array;
}

function top(array) {
  for (let i = 0; i < array.length; i++) {
    array[i] = array[i] ? 1 : 0;
  }
  return array;
}

function show(title, heatmap) {
  console.log("= __________________________________________ =", title);
  console.log(" |                                          | ");
  for (let offset = 90; offset >= 0; offset -= 10) {
    const line = [];
    for (let x = 0; x < 10; x++) {
      const v = heatmap[offset + x];
      if (v > 0) {
        let c = "" + Math.floor(v * 10);
        while (c.length < 4) c = " " + c;
        line.push(c);
      } else {
        line.push("    ");
      }
    }
    console.log(" |", line.join(""), "|");
  }
  console.log(" |__________________________________________| ");
  console.log("=                                            =");
  console.log();
}

async function run(model, samples, input, output) {
  tf.engine().startScope();

  const info = await model.fit(input, output, { epochs: LEARNING_EPOCHS, batchSize: LEARNING_BATCH, shuffle: true, verbose: false });
  const predictions = await model.predict(input, { batchSize: samples.input.length }).array();

  const result = {
    loss: info.history.loss.reduce((best, current) => Math.min(current, best), Infinity),
    error: error(samples.output, predictions),
  };

  tf.engine().endScope();

  return result;
}

function error(output, predictions) {
  let errors = [];

  for (let i = 0; i < predictions.length; i++) {
    let error = 0;

    for (let j = 0; j < predictions[i].length; j++) {
      if ((output[i][j] >= 0.1) || (predictions[i][j] >= 0.1)) {
        error = Math.max(error, Math.abs(output[i][j] - predictions[i][j]));
      }
    }

    errors.push(error);
  }
  errors.sort((a, b) => (a - b));

  return {
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
  model.add(tf.layers.dense({ inputShape: [INPUT_SIZE], units: 400, activation: ACTIVATION_FUNCTION }));
  model.add(tf.layers.dense({ units: OUTPUT_SIZE, activation: ACTIVATION_FUNCTION }));
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

async function train() {
  const file = "./train/military/deploy-troops.tf";
  const samples = prepareSamples("./skill/starcraft/deploy-troops/samples.txt");
  const input = tf.tensor(samples.input, [samples.input.length, INPUT_SIZE]);
  const output = tf.tensor(samples.output, [samples.output.length, OUTPUT_SIZE]);
  const model = fs.existsSync(file) ? await load(file) : create();

  let iteration = 0;
  while (++iteration > 0) {
    const attempt = await run(model, samples, input, output);

    const line = [new Date().toISOString().split("T")[1].split(".")[0], iteration];

    const error = attempt.error;
    line.push("best: " + error.best.toFixed(2));
    line.push(error.a.toFixed(2));
    line.push(error.b.toFixed(2));
    line.push(error.c.toFixed(2));
    line.push(error.d.toFixed(2));
    line.push("worst: " + error.worst.toFixed(2));

    line.push("loss: " + attempt.loss);

    console.log(line.join("\t"));

    await save(model, file);
  }
}

train();
