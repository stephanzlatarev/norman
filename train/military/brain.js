import * as tf from "@tensorflow/tfjs-node-gpu";
import fs from "fs";

const LEARNING_EPOCHS = 100;
const LEARNING_BATCH = 512;
const ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

export default class Brain {

  constructor(body, memory, file) {
    this.body = body;
    this.memory = memory;
    this.file = file;
  }

  watch(monitor) {
    this.monitor = monitor;
  }

  async learn() {
    await startScope(this);

    const batch = this.memory.all();
    const { copy, scaling } = scaleDownInput(batch.input);
    const input = tf.tensor(copy, [batch.input.length, this.body.sensor.length]);
    const output = tf.tensor(scaleDownOutput(batch.output, scaling), [batch.output.length, this.body.motor.length]);

    let epochs = LEARNING_EPOCHS;
    let loss = Infinity;

    this.loss = loss;

    do {
      if ((loss >= this.loss) && (loss !== Infinity)) epochs *= 10;

      const info = await this.model.fit(input, output, {
        epochs: epochs,
        batchSize: LEARNING_BATCH,
        shuffle: true,
        verbose: false,
      });

      this.loss = loss;
      loss = info.history.loss.reduce((best, current) => Math.min(current, best), loss);

      this.summary = "Loss: " + loss + " | Samples: " + this.memory.input.length;

      if (this.monitor) this.monitor(this.summary);
    } while ((loss < this.loss) || (epochs === LEARNING_EPOCHS));

    endScope();
  }

  async react(input) {
    return (await this.reactMany([input]))[0];
  }

  async reactMany(inputs) {
    await startScope(this);

    const { copy, scaling } = scaleDownInput(inputs);
    const question = tf.tensor(copy, [inputs.length, this.body.sensor.length]);
    const answer = await this.model.predict(question, { batchSize: inputs.length }).array();

    endScope();

    return scaleUpOutput(answer, scaling);
  }

  async load() {
    if (this.file && fs.existsSync(this.file)) {
      try {
        this.model = await tf.loadLayersModel(new Storage(this.file));
        this.model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
        return;
      } catch (error) {
        console.log(error.message);
      }
    } else {
      this.model = create(this.body.sensor.length, this.body.motor.length);
    }
  }

  async save() {
    if (this.file) {
      await this.model.save(new Storage(this.file));
    }
  }
}

function create(inputSize, outputSize) {
  const model = tf.sequential();

  model.add(tf.layers.dense({ inputShape: [inputSize], units: Math.floor((inputSize + outputSize) / 2), activation: ACTIVATION_FUNCTION }));
  model.add(tf.layers.dense({ units: outputSize, activation: ACTIVATION_FUNCTION }));
  model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });

  return model;
}

async function startScope(brain) {
  tf.engine().startScope();

  if (!brain.model) {
    await brain.load();
  }
}

function endScope() {
  tf.engine().endScope();
}

class Storage {

  constructor(file) {
    this.file = file;
  }

  async load() {
    const model = JSON.parse(fs.readFileSync(this.file));
    model.weightData = new Uint8Array(model.weightData).buffer;
    return model;
  }

  async save(model) {
    model.weightData = Array.from(new Uint8Array(model.weightData));
    fs.writeFileSync(this.file, JSON.stringify(model));
  }
}

function scaleDownInput(input) {
  const copy = JSON.parse(JSON.stringify(input));
  const scaling = [];

  for (const one of copy) {
    let scale = 0;
    for (let i = 0; i < one.length; i++) scale = Math.max(scale, Math.abs(one[i]));
    scale *= 1.1;
    for (let i = 0; i < one.length; i++) one[i] /= scale;
    scaling.push(scale);
  }

  return { copy: copy, scaling: scaling };
}

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
