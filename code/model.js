import Node from "./node.js";
import { EVENT_CREATE_NODE, EVENT_DELETE_NODE } from "./codes.js";

const REF_BASE_MODEL = 1000000;

// Memory models are used to manipulate memory
export default class Model {

  constructor(memory, ref, callback) {
    this.memory = memory;
    this.ref = ref;
    this.callback = callback;
    this.nindex = 1;
    this.nodes = {};
  }

  // Get a memory node
  get(label) {
    return this.nodes[label];
  }

  // Add a memory node
  add(label) {
    if (label) {
      let node = this.nodes[label];

      if (!node) {
        node = new Node(label, REF_BASE_MODEL * this.ref + this.nindex++, this.callback);
        this.nodes[label] = node;

        if (this.callback) {
          this.callback(EVENT_CREATE_NODE, node);
        }
      }

      return node;
    }
  }

  // Find one memory node from memory
  one(data, onlyFromThisModel) {
    // TODO: Optimize by indexing
    for (const label in this.nodes) {
      const node = this.nodes[label];

      if (node.match(data)) {
        return node;
      }
    }

    if (!onlyFromThisModel) {
      return this.memory.one(data);
    }
  }

  // Find many memory nodes from memory
  all(data, onlyFromThisModel) {
    if (onlyFromThisModel) {
      // TODO: Optimize by indexing
      const result = [];

      for (const label in this.nodes) {
        const node = this.nodes[label];

        if (node.match(data)) {
          result.push(node);
        }
      }

      return result;
    } else {
      return this.memory.all(data);
    }
  }

  remove(object) {
    if (object === this) {
      this.memory.remove(this);
    } else if (object instanceof Node) {
      if (this.nodes[object.label]) {
        delete this.nodes[object.label];

        if (this.callback) {
          this.callback(EVENT_DELETE_NODE, object);
        }
      }
    }
  }

}
