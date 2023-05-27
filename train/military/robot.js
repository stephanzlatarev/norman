import Brain from "./brain.js";
import Memory from "./memory.js";
import mirrors from "./mirrors.js";

const FOLDER = "./train/military/";
const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;

export default class Robot {

  constructor(name, memory, randomness) {
    this.name = name;
    this.randomness = randomness;
    this.log = [];
    this.experiments = [];

    if (memory) {
      this.memory = new Memory(memory).load(FOLDER + name + ".json");
    }

    const body = { sensor: [], motor: []};
    body.sensor.length = INPUT_SIZE;
    body.motor.length = OUTPUT_SIZE;
    this.brain = new Brain(body, this.memory, FOLDER + name + ".tf");
  }

  start() {
    this.log = [];
    this.experiments = [];
    delete this.practice;
    delete this.experiment;
  }

  async deploy(ownMilitary, ownEconomy, enemyMilitary, enemyEconomy) {
    if (this.practice) {
      this.log.push({ input: this.practice, output: [...ownMilitary] });
    }
    if (this.experiment) {
      this.experiments.push({ input: this.experiment, output: [...ownMilitary] });
      delete this.experiment;
    }

    const input = [...ownMilitary, ...ownEconomy, ...enemyMilitary, ...enemyEconomy];
    const deployment = await this.brain.react(input);

    this.practice = [...input];

    if (Math.random() < this.randomness) {
      this.experiment = [...input];
      randomize(deployment);
    }

    return deployment;
  }

  async study() {
    if (!this.log.length) return;

    for (const mirror of mirrors) {
      this.memory.add(mirror(this.log));
    }
    this.memory.store("./train/military/samples.json");

    await this.brain.learn();
  }
}

function randomize(deployment) {
  const spots = [];

  for (let i = 0; i < deployment.length; i++) {
    if (deployment[i] >= 0.1) {
      spots.push(i);
    }
  }

  const source = spots[Math.floor(spots.length * Math.random())];
  const target = Math.floor(100 * Math.random());

  deployment[target] += deployment[source];
  deployment[source] = 0;
}
