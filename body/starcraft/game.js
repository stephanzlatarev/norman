import starcraft from "@node-sc2/proto";
import observe from "./observe.js";

let loop = 0;

export default class Game {

  constructor(node) {
    this.node = node;
    this.client = starcraft();
    this.actions = [];
  }

  async tick() {
    loop++;
    await this.client.step({ count: 1 });
    await observe(this.node, this.client);
  }

  async tock() {
    if (this.node.get("over")) this.detach();
  }

  async detach() {
    if (this.client) {
      await this.client.quit();
    }
  }

}

const print = console.log;

console.log = function() {
  print(clock(), ...arguments);
}

function twodigits(value) {
  if (value < 10) return "0" + value;
  return value;
}

function clock() {
  const seconds = Math.floor(loop / 22.5);
  const minutes = Math.floor(seconds / 60);
  return twodigits(minutes) + ":" + twodigits(seconds % 60);
}
