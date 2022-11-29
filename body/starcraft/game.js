import starcraft from "@node-sc2/proto";
import observe from "./observe.js";

export default class Game {

  constructor(node) {
    this.node = node;
    this.client = starcraft();
    this.actions = [];
  }

  async tick() {
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
