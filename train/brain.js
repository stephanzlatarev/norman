import * as tf from "@tensorflow/tfjs-node";
import Lot from "./lot.js";

const MAX_SAMPLES = 100000;
const HIDDEN_LAYER_INFLATION = 1.2;
const OPTIMIZER_RATE = 0.2;
const ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = tf.train.sgd(OPTIMIZER_RATE);
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
    const time = new Date().getTime();
    const batch = this.lot.batch(this.learningBatchSize);
    const input = tf.tensor(batch.input, [this.learningBatchSize, this.inputSize]);
    const output = tf.tensor(batch.output, [this.learningBatchSize, this.outputSize]);
    let info;
    let cycle = 0;

    while (new Date().getTime() - time < millis) {
      info = await this.model.fit(input, output, {
        epochs: this.learningEpochs,
        batchSize: this.learningBatchSize,
        shuffle: true,
        verbose: false,
      });
      cycle++;
    }

    console.log("Learning", cycle, "batches for", (new Date().getTime() - time), "millis improved accuracy to", accuracy(info));
  }

  async answer(input) {
    const question = tf.tensor(input, [1, this.inputSize]);
    const answer = await this.model.predict(question).array();
//    console.log("ANSWER:", JSON.stringify(input), "->", JSON.stringify(answer), "=", JSON.stringify(answer[0]));
    return answer[0];
  }

  async random() {
    const data = [];

    for (let i = 0; i < this.outputSize; i++) data.push(Math.random());

    return data;
  }

}

function accuracy(info) {
  let sum = 0;
  let count = 0;

  for (const loss of info.history.loss) {
    sum += loss;
    count++;
  }

  return count ? (1 - sum / count) : -1;
}
