import * as tensorflow from "@tensorflow/tfjs-node";
import fs from "fs";

const tf = tensorflow.engine ? tensorflow : tensorflow.default;

const HIDDEN_LAYER_INFLATION = 0.8;
const LEARNING_EPOCHS = 100;
const LEARNING_BATCH = 50;
const ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

export default class Brain {

  constructor(body, memory, file) {
    this.body = body;
    this.memory = memory;
    this.file = file;
  }

  async learn(millis) {
    await startScope(this);

    const time = new Date().getTime();
    const batch = this.memory.all();
    const input = tf.tensor(batch.input, [batch.input.length, this.body.sensor.length]);
    const output = tf.tensor(batch.output, [batch.output.length, this.body.motor.length]);

    let info;

    while (new Date().getTime() - time < millis) {
      info = await this.model.fit(input, output, {
        epochs: LEARNING_EPOCHS,
        batchSize: LEARNING_BATCH,
        shuffle: true,
        verbose: false,
      });
    }

    await this.model.save(new Storage(this.file));

    summary(time, info);

    endScope();
  }

  async react(input) {
    await startScope(this);

    const question = tf.tensor(input, [1, this.body.sensor.length]);
    const answer = await this.model.predict(question).array();

    endScope();

    return answer[0];
  }

  async random() {
    const data = [];

    for (let i = 0; i < this.body.motor.length; i++) data.push(Math.random());

    return data;
  }
}

async function create(inputSize, outputSize) {
  const model = tf.sequential();

  model.add(tf.layers.dense({ inputShape: [inputSize], units: Math.floor(inputSize * HIDDEN_LAYER_INFLATION), activation: ACTIVATION_FUNCTION }));
  model.add(tf.layers.dense({ units: outputSize, activation: ACTIVATION_FUNCTION }));
  model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });

  return model;
}

async function startScope(brain) {
  tf.engine().startScope();

  if (brain.model) return;

  if (brain.file) {
    try {
      brain.model = await tf.loadLayersModel(new Storage(brain.file));
      brain.model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
      return;
    } catch (error) {
      console.log(error.message);
    }
  }

  brain.model = await create(brain.body.sensor.length, brain.body.motor.length);
}

function endScope() {
  tf.engine().endScope();
}

function summary(time, info) {
  const lossAtStart = info.history.loss[0];
  const lossAtEnd = info.history.loss[info.history.loss.length - 1];
  const accuracy = 1 - lossAtEnd;
  const iterationsTillZeroLoss = (lossAtStart - lossAtEnd) ? lossAtEnd / (lossAtStart - lossAtEnd) : -1;
  const millisPerIteration = new Date().getTime() - time;
  const perfectionTime = new Date(new Date().getTime() + millisPerIteration * iterationsTillZeroLoss);

  console.log("Accuracy:", accuracy, "\tPerfection:", (iterationsTillZeroLoss > 0) ? perfectionTime.toISOString() : "-");
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
