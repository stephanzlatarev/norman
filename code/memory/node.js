
export default class Node {

  constructor(memory, path) {
    this.memory = memory;
    this.path = path;
    this.data = {};

    if (memory) {
      this.ref = memory.index++;
      memory.nodes.push(this);
    }
  }

  props() {
    const props = {};

    for (const label in this.data) {
      const item = this.data[label];

      if ((typeof(item) === "boolean") || (typeof(item) === "number") || (typeof(item) === "string")) {
        props[label] = item;
      }
    }

    return props;
  }

  links() {
    const links = [];

    for (const label in this.data) {
      const item = this.data[label];

      if (item instanceof Node) {
        links.push(item);
      }
    }

    return links;
  }

  clearLinks() {
    for (const label in this.data) {
      if (this.data[label] instanceof Node) {
        delete this.data[label];
      }
    }

    return this;
  }

  get(label) {
    const path = label.split("/");
    const firstLabel = path[0];
    const firstNode = this.data[firstLabel];

    if (path.length === 1) {
      return firstNode;
    } else if (firstNode) {
      const nextLabels = label.substring(firstLabel.length + 1);
      return firstNode.get(nextLabels);
    }
  }

  clear(label) {
    delete this.data[label];
    return this;
  }

  set(label, value) {
    this.data[label] = value;
    return this;
  }

  unlink(node) {
    for (const label in this.data) {
      const item = this.data[label];

      if (item === node) {
        delete this.data[label];
      }
    }
  }

  remove() {
    this.memory.remove(this);
  }

}
