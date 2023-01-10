import Node from "./node.js";

export default class Memory {

  constructor(data) {
    this.refs = {};
    this.index = 0;

    this.nodes = [];
    this.root = new Node(this);
    populate(this.root, data);
  }

  get(path) {
    let node = this.root;

    if (path) {
      path = path.split("/");

      for (const part of path) {
        const parent = node;

        node = parent.get(part);

        if (!node) {
          node = new Node(this, constructPath(parent, part));
          parent.set(part, node);
          this.refs[node.ref] = node;
        }
      }
    }

    return node;
  }

  // TODO: Remove ref(ref)
  ref(ref) {
    return this.refs[ref];
  }

  print() {
    console.log(toString(this.root, "\n"));
  }
}

function constructPath(parent, path) {
  return parent.path ? parent.path + "/" + path : path;
}

function populate(node, data) {
  if (!data) return;

  for (const key in data) {
    if (typeof(data[key]) === "object") {
      if (data[key].data) {
        node.set(key, data[key].data);
      } else {
        const child = new Node(node.memory, constructPath(node, key));
        node.set(key, child);
        node.memory.refs[child.ref] = child;
        populate(child, data[key]);
      }
    } else if (data[key]) {
      node.set(key, data[key]);
    }
  }
}

function toString(node, tab) {
  let text = "[" + node.path + " #" + node.ref + "]";
  tab += "  ";

  for (const key in node.data) {
    const item = node.data[key];
    const type = (typeof(item) === "object") ? item.constructor.name : typeof(item);
    if ((type === "boolean") || (type === "number") || (type === "string") || (type === "Array")) {
      text += tab + key + ": " + JSON.stringify(item);
    } else if (type !== "Node") {
      text += tab + key + ": <" + type + ">";
    }
  }

  for (const key in node.data) {
    const link = node.data[key];
    if (link instanceof Node) {
      if (!node.path || link.path.startsWith(node.path + "/")) {
        text += tab + key + ": " + toString(link, tab);
      } else {
        text += tab + key + ": [" + link.path + " #" + link.ref + "]";
      }
    }
  }

  return text;
}
