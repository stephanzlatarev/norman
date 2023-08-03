import Model from "./model.js";
import Node from "./node.js";
import Pattern from "./pattern.js";
import { EVENT_CREATE_NODE, EVENT_UPDATE_NODE, EVENT_DELETE_NODE } from "./codes.js";

// Memory stores information in nodes
export default class Memory {

  constructor() {
    this.models = [];
    this.patterns = [];

    this.metrics = { nodes: 0, patterns: 0, changes: 0 };
    this.main = this.model();
  }

  add(label) {
    for (const model of this.models) {
      const node = model.get(label);

      if (node instanceof Node) {
        return node;
      }
    }

    return this.main.add(label);
  }

  model() {
    const model = new Model(this, this.models.length, this.onChange.bind(this));
    this.models.push(model);
    return model;
  }

  remove(object) {
    if (object instanceof Model) {
      const index = this.models.indexOf(object);

      if (index >= 0) {
        this.models.splice(index, 1);
      }
    } else if (object instanceof Pattern) {
      const index = this.patterns.indexOf(object);

      if (index >= 0) {
        this.patterns.splice(index, 1);
      }

      this.metrics.patterns = this.patterns.length;
    } else if (object instanceof Node) {
      for (const model of this.models) {
        model.remove(object);
      }

      this.metrics.nodes--;
    }
  }

  // Find all matching memory nodes
  all(data) {
    const result = [];

    for (const model of this.models) {
      for (const node of model.all(data, true)) {
        result.push(node);
      }
    }

    return result;
  }

  // Find one matching memory node
  one(data) {
    for (const model of this.models) {
      const node = model.one(data, true);

      if (node) {
        return node;
      }
    }
  }

  // Create a pattern
  pattern(pattern) {
    const instance = new Pattern(this, pattern);

    this.patterns.push(instance);
    this.metrics.patterns = this.patterns.length;

    return instance;
  }

  async notifyPatternListeners() {
    for (const pattern of [...this.patterns]) {
      await pattern.notifyListener();
    }
  }

  onChange(type, node, label, value) {
    if (node.removed) return;

    if (type === EVENT_DELETE_NODE) {
      node.removed = true;

      if (node.links) {
        for (const link of node.links) {
          link.node.set(link.label, false);
        }
      }
    }

    if (value instanceof Node) {
      if (!value.links) value.links = [];
      value.links.push({ node: node, label: label });
    }

    switch (type) {
      case EVENT_CREATE_NODE: { this.metrics.nodes++; break; }
      case EVENT_UPDATE_NODE: { this.metrics.changes++; break; }
      case EVENT_DELETE_NODE: { this.metrics.nodes--; break; }
    }

    for (const pattern of this.patterns) {
      pattern.onChange(type, node, label, value);
    }
  }

}
