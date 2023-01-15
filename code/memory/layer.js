import Node from "./node.js";

export default class Layer {

  constructor(layer, paths) {
    this.layer = layer;
    this.paths = paths;
  }

  get(label) {
    const path = label.split("/");
    const firstLabel = path[0];

    if (this.layer[firstLabel]) {
      const firstNode = this.layer[firstLabel];

      if (path.length === 1) {
        return firstNode;
      } else {
        const nextLabels = label.substring(firstLabel.length + 1);
        return firstNode.get(nextLabels);
      }
    }

    return this.layer.BODY ? this.layer.BODY.get(label) : null;
  }

  set(label, value) {
    if (this.paths[label]) {
      const path = this.paths[label];
      const node = this.layer[path[0]];
      const pathLabel = path[1];
      const pathTarget = this.layer[path[2]];

      if (value > 0) {
        node.set(pathLabel, pathTarget);

        if (!pathTarget.memory) {
          pathTarget.memory = node.memory;
          pathTarget.path = node.path + "/" + pathLabel;
          pathTarget.ref = node.memory.index++;
          node.memory.nodes.push(pathTarget);
        }
      } else if ((value < 0) && (node.get(pathLabel) === pathTarget)) {
        node.clear(pathLabel);
      }
    } else if (this.layer[label.split("/")[0]]) {
      const path = label.split("/");
      if (path.length === 1) {
        if (value === -1) {
          this.layer[label].remove();
        }
      } else if (path.length === 2) {
        this.layer[path[0]].set(path[1], value);
      } else {
        console.log("ERROR: No deep set support for", label, "in memory layer");
      }
    } else if (this.layer.BODY) {
      this.layer.BODY.set(label, value);
    }
  }

  print() {
    console.log("=== memory layer ===");
    for (const key in this.layer) {
      const value = this.layer[key];

      if (value instanceof Node) {
        console.log(key + ":\t", value.path, "#" + value.ref);
      } else if (typeof(value) === "number") {
        console.log(key + ":\t", value);
      } else {
        console.log(key + ":\t-");
      }
    }
  }
}
