import Brain from "../brain.js";

const FILE = "./train/military/brain.tf";
const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;

export default class Robot {

  constructor(name, memory) {
    this.name = name;

    const body = { sensor: [], motor: []};
    body.sensor.length = INPUT_SIZE;
    body.motor.length = OUTPUT_SIZE;

    this.brain = new Brain(body, memory, FILE);
  }

  async study() {
    await this.brain.learn(5000);
  }

  deploy(military) {
    const deployment = [];
    let army = 0;

    for (let i = 0; i < military.length; i++) {
      if (military[i] >= 0.1) {
        army += military[i];
      }

      deployment.push(0);
    }

    for (let i = 0; i < army; i++) {
      deployment[Math.floor(100 * Math.random())]++;
    }

    return deployment;
  }

}
