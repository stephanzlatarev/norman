import Model from "./model.js";

// Memory stores information in nodes
export default class Memory {

  constructor() {
    this.nodes = [];
    this.models = [];
  }

  model() {
    const model = new Model(this, this.models.length);
    this.models.push(model);
    return model;
  }

  // Find a memory node
  find(data) {
    for (const model of this.models) {
      const node = model.find(data, true);

      if (node) {
        return node;
      }
    }
  }

}
