import { EVENT_UPDATE_NODE } from "./codes.js";

// Memory nodes store information as numbers and links to other nodes
export default class Node {

  constructor(label, ref, callback) {
    this.ref = ref;
    this.callback = callback;

    this.label = label;
    this.data = {};
  }

  clear(label) {
    return this.set(label, 0);
  }

  link(node) {
    this.set(node.label ? node.label : node.ref, node);
  }

  set(label, value) {
    if (value === undefined) return this;
    if (label === "label") return this;

    value = canon(value);
    if (value) {
      if (this.data[label] === value) return this;
      this.data[label] = value;
    } else {
      if (this.data[label] === undefined) return this;
      delete this.data[label];
    }

    if (this.callback) {
      this.callback(EVENT_UPDATE_NODE, this, label, value);
    }

    return this;
  }

  get(label) {
    const data = this.data[label];

    if (!data) return 0;

    return data;
  }

  values(count) {
    const data = [];

    for (let i = 0; i < count; i++) {
      data.push(canon(this.data[i]));
    }

    return data;
  }

  match(data) {
    if (data.label && (this.label !== data.label)) return false;

    for (const label in data) {
      if (label === "label") continue;

      if (typeof(data[label]) === "string") {
        const node = this.get(label);
        if (!(node instanceof Node) || (node.label !== data[label])) return false;
      } else {
        if (!match(canon(data[label]), this.get(label))) return false;
      }
    }

    return true;
  }

  get[Symbol.toStringTag]() {
    return this.label + " #" + this.ref;
  }

}

function canon(value) {
  if (value instanceof Node) return value;

  if (value === true) return 1;
  if (value === false) return 0;

  if (value < 0) return value;
  if (value === 0) return 0;
  if (value > 0) return value;

  return 0;
}

function match(a, b) {
  if (!a && b) return false;
  if (a !== b) return false;
  return true;
}
