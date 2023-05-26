import * as tf from "@tensorflow/tfjs-node-gpu";
import fs from "fs";

const LEARNING_EPOCHS = 20;
const LEARNING_BATCH = 1024;
const ACTIVATION_FUNCTION = "relu";
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

export default class Brain {

  constructor(body, memory, file) {
    this.body = body;
    this.memory = memory;
    this.file = file;
  }

  async learn() {
    await startScope(this);

    const batch = this.memory.all();
    const input = tf.tensor(batch.input, [batch.input.length, this.body.sensor.length]);
    const output = tf.tensor(batch.output, [batch.output.length, this.body.motor.length]);

    let loss;

    do {
      const info = await this.model.fit(input, output, {
        epochs: LEARNING_EPOCHS,
        batchSize: LEARNING_BATCH,
        shuffle: true,
        verbose: false,
      });

      loss = info.history.loss[info.history.loss.length - 1];

      this.summary = "Loss: " + loss.toFixed(2) + " | Samples: " + this.memory.input.length;
    } while (this.loss >= 1);

    if (this.file) {
      await this.model.save(new Storage(this.file));
    }

    endScope();
  }

  async react(input) {
    await startScope(this);

    const question = tf.tensor(input, [1, this.body.sensor.length]);
    const answer = await this.model.predict(question).array();

    endScope();

    return answer[0];
  }

  async reactMany(inputs) {
    tf.engine().startScope();

    const question = tf.tensor(inputs, [inputs.length, this.body.sensor.length]);
    await this.model.predict(question).array();

    tf.engine().endScope();
  }

  random() {
    const data = [];

    for (let i = 0; i < this.body.motor.length; i++) data.push(Math.random());

    return data;
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

  if (brain.model) return;

  if (brain.file && fs.existsSync(brain.file)) {
    try {
      brain.model = await tf.loadLayersModel(new Storage(brain.file));
      brain.model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
      return;
    } catch (error) {
      console.log(error.message);
    }
  } else {
    brain.model = create(brain.body.sensor.length, brain.body.motor.length);
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
