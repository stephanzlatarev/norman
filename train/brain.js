import * as tf from "@tensorflow/tfjs-node";
import Lot from "./lot.js";

const MAX_SAMPLES = 100000;
const HIDDEN_LAYER_INFLATION = 0.8;
const ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

export default class {

  constructor(inputSize, outputSize, learningEpochs, learningBatchSize) {
    this.inputSize = inputSize;
    this.outputSize = outputSize;
    this.learningEpochs = learningEpochs;
    this.learningBatchSize = learningBatchSize;

    this.model = tf.sequential();
    this.model.add(tf.layers.dense({ inputShape: [inputSize], units: Math.floor(inputSize * HIDDEN_LAYER_INFLATION), activation: ACTIVATION_FUNCTION }));
    this.model.add(tf.layers.dense({ units: outputSize, activation: ACTIVATION_FUNCTION }));
    this.model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });

    this.lot = new Lot(MAX_SAMPLES);
  }

  // Expects input and output to be one-dimensional array, and score to be a number
  learn(input, output, score) {
    this.lot.push(input, output, score);
  }

  async run(millis) {
    tf.engine().startScope();

    const time = new Date().getTime();
    const batch = this.lot.batch(this.learningBatchSize);
    const input = tf.tensor(batch.input, [this.learningBatchSize, this.inputSize]);
    const output = tf.tensor(batch.output, [this.learningBatchSize, this.outputSize]);
    let info;

    while (new Date().getTime() - time < millis) {
      info = await this.model.fit(input, output, {
        epochs: this.learningEpochs,
        batchSize: this.learningBatchSize,
        shuffle: true,
        verbose: false,
      });
    }

    summary(time, info);

    tf.engine().endScope();
  }

  async answer(input) {
    tf.engine().startScope();

    const question = tf.tensor(input, [1, this.inputSize]);
    const answer = await this.model.predict(question).array();

    tf.engine().endScope();

    return answer[0];
  }

  async random() {
    const data = [];

    for (let i = 0; i < this.outputSize; i++) data.push(Math.random());

    return data;
  }

  async load(file) {
    this.model = await tf.loadLayersModel(file);
    this.model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
  }

  async save(folder) {
    await this.model.save(folder);
  }
}

function summary(time, info) {
  const lossAtStart = info.history.loss[0];
  const lossAtEnd = info.history.loss[info.history.loss.length - 1];
  const accuracy = 1 - lossAtEnd;
  const iterationsTillZeroLoss = (lossAtStart - lossAtEnd) ? lossAtEnd / (lossAtStart - lossAtEnd) : -1;
  const millisPerIteration = new Date().getTime() - time;
  const perfectionTime = new Date(new Date().getTime() + millisPerIteration * iterationsTillZeroLoss);

  console.log("Accuracy:", accuracy, "\tPerfection:", perfectionTime.toISOString());
}
