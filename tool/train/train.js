import fs from "fs";
import * as tf from "@tensorflow/tfjs-node";

const BRAIN = "/data/brain.tf";
const PLAYBOOKS = "./skill/playbook/";

const SAMPLES_COUNT = 5000;
const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;
const LEARNING_EPOCHS = 10;
const LEARNING_BATCH = 1024;
const HIDDEN_ACTIVATION_FUNCTION = "relu";
const OUTPUT_ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

async function loadPlaybooks() {
  const scripts = fs.readdirSync(PLAYBOOKS).filter(name => name.endsWith(".js"));
  const playbooks = [];

  for (const script of scripts) {
    const module = await import(PLAYBOOKS + script);
    playbooks.push({
      name: script.substring(0, script.length - 3),
      sample: module.default,
    });
  }

  return playbooks;
}

function generateSamples(playbooks) {
  const source = [];
  const input = [];
  const output = [];

  for (const playbook of playbooks) {
    for (let i = 0; i < SAMPLES_COUNT; i++) {
      const sample = playbook.sample();
      source.push(playbook.name);
      input.push(sample.input);
      output.push(sample.output);
    }
  }

  return {
    length: input.length,
    source: source,
    input: input,
    inputSize: INPUT_SIZE,
    output: output,
    outputSize: OUTPUT_SIZE,
  };
}

async function run(playbooks, model) {
  tf.engine().startScope();

  const samples = generateSamples(playbooks);
  const input = tf.tensor(samples.input, [samples.input.length, samples.inputSize]);
  const output = tf.tensor(samples.output, [samples.output.length, samples.outputSize]);
  const info = await model.fit(input, output, { epochs: LEARNING_EPOCHS, batchSize: LEARNING_BATCH, shuffle: true, verbose: false });
  const predictions = await model.predict(input, { batchSize: samples.input.length }).array();

  const result = {
    loss: info.history.loss.reduce((best, current) => Math.min(current, best), Infinity),
    error: error(samples, predictions),
  };

  tf.engine().endScope();

  return result;
}

function error(samples, predictions) {
  const errors = { total: [] };
  const result = {};

  for (let i = 0; i < predictions.length; i++) {
    let error = 0;

    for (let j = 0; j < predictions[i].length; j++) {
      error = Math.max(error, Math.abs(samples.output[i][j] - predictions[i][j]));
    }

    errors.total.push(error);
    if (!errors[samples.source[i]]) errors[samples.source[i]] = [];
    errors[samples.source[i]].push(error);
  }

  for (const key in errors) {
    const errs = errors[key];
    errs.sort((a, b) => (a - b));

    let pass = 0;
    let fail = 0;
    for (const error of errs) {
      if (error < 0.01) {
        pass++;
      } else if (error > 0.99) {
        fail++;
      }
    }

    result[key] = {
      pass: pass / errs.length,
      fail: fail,
      best: errs[0],
      a: errs[Math.floor(errs.length * 0.9)],
      b: errs[Math.floor(errs.length * 0.99)],
      c: errs[Math.floor(errs.length * 0.999)],
      d: errs[Math.floor(errs.length * 0.9999)],
      worst: errs[errs.length - 1],
    };
  }

  return result;
}

function create() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [INPUT_SIZE], units: INPUT_SIZE, activation: HIDDEN_ACTIVATION_FUNCTION }));
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

function show(iteration, results) {
  console.log(new Date().toISOString().split("T")[1].split(".")[0], "iteration:", iteration, "loss:", results.loss);

  for (const key in results.error) {
    const line = [""];
    const error = results.error[key];

    line.push("best: " + error.best.toFixed(5));
    line.push(error.a.toFixed(2));
    line.push(error.b.toFixed(2));
    line.push(error.c.toFixed(2));
    line.push(error.d.toFixed(2));
    line.push("worst: " + error.worst.toFixed(5));
    line.push("pass: " + (error.pass * 100).toFixed(2) + "%");
    line.push("fail: " + error.fail);

    line.push(key);

    console.log(line.join("\t"));
  }
}

async function train() {
  const playbooks = await loadPlaybooks();
  const model = fs.existsSync(BRAIN) ? await load(BRAIN) : create();

  model.summary();

  let iteration = 0;
  while (++iteration > 0) {
    const attempt = await run(playbooks, model);

    show(iteration, attempt);

    await save(model, BRAIN);
  }
}

train();
