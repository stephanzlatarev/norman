import * as tf from "@tensorflow/tfjs-node";
import Lot from "./lot.js";

const MAX_SAMPLES = 100000;
const HIDDEN_LAYER_INFLATION = 1.2;
const OPTIMIZER_RATE = 0.1;
const ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = tf.train.sgd(OPTIMIZER_RATE);
const LOSS_FUNCTION = loss;

let mask;
let maskSize;

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
    let cycle = 0;

//    console.log("SIZE:", batch.input.length);
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

// Similar to "meanSquaredError" but treats second point as a circle (0.0 == 1.0)
function loss(expect, actual) {
  if (maskSize !== expect.shape[0]) {
    mask = createMask(expect);
  }

  let error = actual.sub(expect).abs();
  error = error.minimum(error.sub(mask).abs());

  return error.square().mean();
}

function createMask(tensor) {
  const zero = tf.zerosLike(tensor).slice([0, 0], [tensor.shape[0], 1]);
  const ones = tf.onesLike(tensor).slice([0, 0], [tensor.shape[0], 1]);

  return zero.concat(ones, 1);
}

function accuracy(info) {
  let sum = 0;
  let count = 0;

//  console.log("EPOCHS:", info.history.loss.length);
  for (const loss of info.history.loss) {
    sum += loss;
    count++;
  }

  return count ? (1 - sum / count) : -1;
}
