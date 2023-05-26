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
    delete this.experiment;
  }

  async deploy(ownMilitary, ownEconomy, enemyMilitary, enemyEconomy) {
    if (this.experiment) {
      this.log.push({ input: this.experiment, output: [...ownMilitary] });
    }

    if (Math.random() < this.randomness) {
      this.experiment = [...ownMilitary, ...ownEconomy, ...enemyMilitary, ...enemyEconomy];
      return random(ownMilitary);
    } else {
      return await this.brain.react([...ownMilitary, ...ownEconomy, ...enemyMilitary, ...enemyEconomy]);
    }
  }

  async study() {
    for (const mirror of mirrors) {
      this.memory.add(mirror(this.log));
    }
    this.memory.store("./train/military/samples.json");

    await this.brain.learn();
  }
}

function random(military) {
  const deployment = [];
  let army = 0;

  for (let i = 0; i < military.length; i++) {
    if (military[i] >= 0.1) {
      army += military[i];
    }

    deployment.push(0);
  }

  for (let i = 0; i < army; i++) {
    const spot = Math.floor(100 * Math.random());
    deployment[spot]++;
  }

  return deployment;
}
