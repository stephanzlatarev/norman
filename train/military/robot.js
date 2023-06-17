import Brain from "./brain.js";
import Memory from "./memory.js";
import mirrors from "./mirrors.js";

const FOLDER = "./train/military/";
const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;

export default class Robot {

  constructor(name, randomness) {
    this.name = name;
    this.randomness = randomness;
    this.memory = new Memory();
    this.number = 1;

    const body = { sensor: [], motor: []};
    body.sensor.length = INPUT_SIZE;
    body.motor.length = OUTPUT_SIZE;
    this.brain = new Brain(body, this.memory, FOLDER + name + ".tf");
  }

  watch(monitor) {
    this.brain.watch(monitor);
  }

  async play(boards) {
    const deployments = await this.brain.reactMany(boards);

    for (const deployment of deployments) {
      if (Math.random() < this.randomness) {
        randomize(deployment);
      }
    }

    return deployments;
  }

  async study(plays) {
    if (!this.memory || !plays || !plays.length) return;

    this.memory.clear();
    for (const play of plays) {
      for (const mirror of mirrors) {
        this.memory.add(mirror(play));
      }
    }

    await this.brain.learn();
  }

  async clone() {
    const clone = new Robot(this.name, this.randomness);
    clone.number = this.number + 1;
    clone.brain.monitor = this.brain.monitor;

    await this.brain.save();
    await clone.brain.load();

    return clone;
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
  const target = Math.floor(deployment.length * Math.random());
  const split = round(deployment[source] / 2);

  deployment[target] += split;
  deployment[source] -= split;
}

function round(value) {
  return Math.max(Math.floor(value * 10) / 10, 0);
}
