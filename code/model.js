import Node from "./node.js";

// Memory models are used to manipulate memory
export default class Model {

  constructor(memory, ref) {
    this.memory = memory;
    this.ref = ref;
    this.nodes = [];
  }

  // Add a memory node
  add() {
    const node = new Node(ref(this), this.onChange.bind(this));
    this.nodes.push(node);
    return node;
  }

  // Find a memory node from memory
  find(data, onlyFromThisModel) {
    const node = find(this, data);

    if (node) {
      return node;
    } else if (!onlyFromThisModel) {
      return this.memory.find(data);
    }
  }

  onChange(node, label, value) {
  }

}

const REF_BASE_MODEL = 1000000;
function ref(model) {
  return model.ref * REF_BASE_MODEL + model.nodes.length;
}

function find(model, props) {
  for (const node of model.nodes) {
    if (node.match(props)) {
      return node;
    }
  }
}
