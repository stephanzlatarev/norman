import * as tf from "@tensorflow/tfjs-node-gpu";
import fs from "fs";

const samples = JSON.parse(fs.readFileSync("./train/military/samples.json"));

const TICK = 1000;
const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;
const LEARNING_EPOCHS = 20;
const LEARNING_BATCH = 1024;
const ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

//function display(placements) {
//  for (let y = 0; y < 10; y++) {
//    const line = [];
//
//    for (let x = 0; x < 10; x++) {
//      line.push(cell(placements[x + y * 10]));
//    }
//
//    console.log(line.join(" "));
//  }
//}
//
//function cell(value) {
//  if (value > 0) {
//    if (value >= 100) return " ###";
//
//    let cell = "" + Math.floor(value * 10);
//    while (cell.length < 4) cell = " " + cell;
//    return cell;
//  }
//
//  return "    ";
//}

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

  }

  async run(millis) {
    tf.engine().startScope();

    const { copy, scaling } = this.scaleDownInput(this.input, this.output);
    const tinput = tf.tensor(copy, [this.input.length, INPUT_SIZE]);
    const toutput = tf.tensor(scaleDownOutput(this.output, scaling), [this.output.length, OUTPUT_SIZE]);

    // Fit model
    const stopTime = Date.now() + millis - this.overtime;
    while (Date.now() < stopTime) {
      await this.model.fit(tinput, toutput, { epochs: LEARNING_EPOCHS, batchSize: LEARNING_BATCH, shuffle: true, verbose: false });
    }
    this.overtime = 0; // Date.now() - stopTime;

    // Test model
    const raw = await this.model.predict(tinput, { batchSize: this.input.length }).array();
    const predictions = scaleUpOutput(raw, scaling);

    let errors = [];
    let avg = 0;
    let max = 0;
    let worstSample;
    let worstError = 0;
    let bestSample;
    let bestError = Infinity;
    for (let i = 0; i < predictions.length; i++) {
      let worseError = 0;
      for (let j = 0; j < predictions[i].length; j++) {
        const thisError = Math.abs(this.output[i][j] - predictions[i][j]);
        errors.push(thisError);

        avg += thisError / predictions.length / predictions[i].length;
        max = Math.max(max, thisError);

        if (thisError > worstError) {
          worstSample = i;
          worstError = thisError;
        }
        if (thisError > worseError) {
          worseError = thisError;
        }
      }
      if (worseError < bestError) {
        bestSample = i;
        bestError = worseError;
      }
    }
    errors.sort((a, b) => (a - b));
    this.error = {
      avg: avg,
      perc99: errors[Math.floor(errors.length * 0.99)],
      max: max,
    };

    tf.engine().endScope();

//    console.log();
    console.log("best sample:", bestError);
//    console.log("   scaling:", JSON.stringify(this.scaling[bestSample]));
//    console.log("     input:", JSON.stringify(this.input[bestSample]));
//    console.log("  s  input:", JSON.stringify((await this.tinput.array())[bestSample]));
//    console.log("    output:", JSON.stringify(this.output[bestSample]));
//    console.log("  s output:", JSON.stringify((await this.toutput.array())[bestSample]));
//    console.log("prediction:", JSON.stringify(predictions[bestSample]));

//    console.log();
    console.log("worst sample:", worstError);
//    console.log("   scaling:", JSON.stringify(this.scaling[worstSample]));
//    console.log("     input:", JSON.stringify(this.input[worstSample]));
//    console.log("  s  input:", JSON.stringify((await this.tinput.array())[worstSample]));
//    console.log("    output:", JSON.stringify(this.output[worstSample]));
//    console.log("  s output:", JSON.stringify((await this.toutput.array())[worstSample]));
//    console.log("prediction:", JSON.stringify(predictions[worstSample]));


    // Remove the worst sample
console.log("remove", worstSample, "from", this.input.length, this.output.length);
    this.input.splice(worstSample, 1);
    this.output.splice(worstSample, 1);

    return worstSample;
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

}

//const SAMPLES_COUNT = 500;
//
//function createInput() {
//  const result = [];
//
//  for (let i = 0; i < SAMPLES_COUNT; i++) {
//    const input = [];
//
//    for (let i = 0; i < INPUT_SIZE; i++) {
//      input.push((Math.random() < 0.1) ? 100 * Math.random() : 0);
//    }
//
//    result.push(input);
//  }
//
//  return result;
//}
//
//function createOutput() {
//  const result = [];
//
//  for (let i = 0; i < SAMPLES_COUNT; i++) {
//    const output = [];
//
//    for (let i = 0; i < OUTPUT_SIZE; i++) {
//      output.push(0);
//    }
//
//    for (let i = 10; i <= 100; i += 10) {
//      const target = Math.floor(OUTPUT_SIZE * Math.random());
//      output[target] = i;
//    }
//
//    result.push(output);
//  }
//
//  return result;
//}

async function test() {
  const input = samples.input;
  const output = samples.output;
  const experiments = [
//    new Experiment(1, 500, 1.0),
//    new Experiment(1, 500, 1.1),
//    new Experiment(1, 500, 1.2),
//    new Experiment(1, 400, 1.0),
    new Experiment(1, 400, 1.1),
//    new Experiment(1, 400, 1.2),
//    new Experiment(1, 300, 1.0),
//    new Experiment(1, 300, 1.1),
//    new Experiment(1, 100, 1.2),
//    new Experiment(2, 100, 1.2),
//    new Experiment(3, 100, 1.2),
//    new Experiment(1, 200, 1.1),
//    new Experiment(1, 100, 1.1),
  ];

  for (const experiment of experiments) {
    experiment.init(input, output);
  }

  for (let iteration = 0; true; iteration++) {
    const line = [iteration, "samples: " + input.length];

    for (const experiment of experiments) {
      await experiment.run(TICK);
      line.push(`${experiment.error.avg.toFixed(2)}/${experiment.error.perc99.toFixed(2)}/${experiment.error.max.toFixed(2)}`);

      if (experiment.error.max < 0.1) {
        console.log(line.join("\t"));
        fs.writeFileSync("./train/military/samples-lean.json", JSON.stringify({ input: experiment.input, output: experiment.output }))
        console.log("Done!");
        return;
      }
    }

    console.log(line.join("\t"));
  }
}

test();
