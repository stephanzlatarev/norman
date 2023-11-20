import fs from "fs";
import * as tensorflow from "@tensorflow/tfjs-node";

const tf = tensorflow.engine ? tensorflow : tensorflow.default;
const file = "./body/starcraft/combat/brain.tf";

export default class Brain {

  async load() {
    const model = JSON.parse(fs.readFileSync(file));
    model.weightData = new Uint8Array(model.weightData).buffer;
    return model;
  }

  async react(inputs) {
    await startScope(this);

    const question = tf.tensor(inputs, [inputs.length, this.inputSize]);
    const answer = await this.model.predict(question).array();

    endScope();

    return answer;
  }

}

async function startScope(brain) {
  tf.engine().startScope();

  if (!brain.model) {
    try {
      brain.model = await tf.loadLayersModel(brain);
      brain.model.compile({ optimizer: "adam", loss: "meanSquaredError" });
      brain.inputSize = brain.model.inputLayers[0].batchInputShape[1];
    } catch (error) {
      console.log(error.message);
    }
  }
}

function endScope() {
  tf.engine().endScope();
}
