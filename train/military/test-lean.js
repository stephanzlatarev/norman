import * as tf from "@tensorflow/tfjs-node-gpu";
import fs from "fs";

const samples = JSON.parse(fs.readFileSync("./train/military/samples.json"));

const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;
const LEARNING_EPOCHS = 100;
const LEARNING_BATCH = 1024;
const ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

function scaleUpOutput(output, scaling) {
  const copy = JSON.parse(JSON.stringify(output));

  for (let i = 0; i < copy.length; i++) {
    const one = copy[i];
    const scale = scaling[i];
    for (let j = 0; j < one.length; j++) {
      one[j] *= scale;
    }
  }

  return copy;
}

function scaleDownOutput(output, scaling) {
  const copy = JSON.parse(JSON.stringify(output));

  for (let i = 0; i < copy.length; i++) {
    const one = copy[i];
    const scale = scaling[i];
    for (let j = 0; j < one.length; j++) {
      one[j] /= scale;
    }
  }

  return copy;
}

class Experiment {

  constructor(numberOfHiddenLayers, numberOfNeuronsInOneHiddenLayer, activationScale) {
    this.numberOfHiddenLayers = numberOfHiddenLayers;
    this.numberOfNeuronsInOneHiddenLayer = numberOfNeuronsInOneHiddenLayer;
    this.activationScale = activationScale;

    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [INPUT_SIZE], units: this.numberOfNeuronsInOneHiddenLayer, activation: ACTIVATION_FUNCTION }));
    for (let i = 1; i < this.numberOfHiddenLayers; i++) {
      model.add(tf.layers.dense({ units: this.numberOfNeuronsInOneHiddenLayer, activation: ACTIVATION_FUNCTION }));
    }
    model.add(tf.layers.dense({ units: OUTPUT_SIZE, activation: ACTIVATION_FUNCTION }));
    model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
    this.model = model;

    this.overtime = 0;
  }

  init(input, output) {
    this.input = input;
    this.output = output;

    const { copy, scaling } = this.scaleDownInput(this.input, this.output);
    this.scaling = scaling;
    this.tinput = tf.tensor(copy, [this.input.length, INPUT_SIZE]);
    this.toutput = tf.tensor(scaleDownOutput(this.output, scaling), [this.output.length, OUTPUT_SIZE]);

    return this;
  }

  async run() {
    tf.engine().startScope();

    const info = await this.model.fit(this.tinput, this.toutput, { epochs: LEARNING_EPOCHS, batchSize: LEARNING_BATCH, shuffle: true, verbose: false });
    const raw = await this.model.predict(this.tinput, { batchSize: this.input.length }).array();
    const predictions = scaleUpOutput(raw, this.scaling);

    this.loss = info.history.loss.reduce((best, current) => Math.min(current, best), Infinity);
    this.error = error(this.output, predictions);

    tf.engine().endScope();

    return this.error;
  }

  scaleDownInput(input, output) {
    const copy = JSON.parse(JSON.stringify(input));
    const scaling = [];

    for (let s = 0; s < copy.length; s++) {
      const thisInput = copy[s];
      const thisOutput = output[s];
      let scale = 0;
      for (let i = 0; i < thisInput.length; i++) scale = Math.max(scale, Math.abs(thisInput[i]));
      for (let i = 0; i < thisOutput.length; i++) scale = Math.max(scale, Math.abs(thisOutput[i]));
      scale *= this.activationScale;
      for (let i = 0; i < thisInput.length; i++) thisInput[i] /= scale;
      scaling.push(scale);
    }

    return { copy: copy, scaling: scaling };
  }

  async load(file) {
    this.model = await tf.loadLayersModel({
      load: function() {
        const model = JSON.parse(fs.readFileSync(file));
        model.weightData = new Uint8Array(model.weightData).buffer;
        return model;
      }
    });
    this.model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
  }

  async save(file) {
    await this.model.save({
      save: function(model) {
        const copy = {...model, weightData: []};
        copy.weightData = Array.from(new Uint8Array(model.weightData));
        fs.writeFileSync(file, JSON.stringify(copy));
      }
    });
  }
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

async function test() {
  const input = samples.input;
  const output = samples.output;
  const experiment = new Experiment(1, 400, 1.1).init(input, output);

  await experiment.load("./train/military/test.tf");

  for (let iteration = 0; true; iteration++) {
    const line = [new Date().toISOString().split("T")[1].split(".")[0], iteration, "samples: " + input.length];

    const error = await experiment.run();
    line.push("best: " + error.best.toFixed(2));
    line.push(error.a.toFixed(2));
    line.push(error.b.toFixed(2));
    line.push(error.c.toFixed(2));
    line.push(error.d.toFixed(2));
    line.push("worst: " + error.worst.toFixed(2));

    line.push("loss: " + experiment.loss);

    console.log(line.join("\t"));

    await experiment.save("./train/military/test.tf");
  }
}

test();
