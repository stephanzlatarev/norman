import fs from "fs";
import * as tensorflow from "@tensorflow/tfjs-node";

const tf = tensorflow.engine ? tensorflow : tensorflow.default;

export default class Brain {

  constructor(folder) {
    this.folder = folder;
  }

  async load() {
    const model = JSON.parse(fs.readFileSync(this.folder + "/brain.tf"));
    model.weightData = new Uint8Array(model.weightData).buffer;
    return model;
  }

  async react(...input) {
    await startScope(this);

    const question = tf.tensor(input, [1, this.model.inputLayers[0].batchInputShape[1]]);
    const answer = await this.model.predict(question).array();

    endScope();

    return answer[0];
  }

}

async function startScope(brain) {
  tf.engine().startScope();

  if (!brain.model) {
    try {
      brain.model = await tf.loadLayersModel(brain);
      brain.model.compile({ optimizer: "adam", loss: "meanSquaredError" });
    } catch (error) {
      console.log(error.message);
    }
  }
}

function endScope() {
  tf.engine().endScope();
}
