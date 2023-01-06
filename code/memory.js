
export default class Memory {

  constructor(data) {
    this.refs = {};
    this.index = 0;

    this.nodes = [];
    this.root = new Node(this);
    populate(this.root, data);
  }

  layers(goal, body, layer) {
    const requiredMatchLists = [];
    const provisionalPaths = {};

    if (!layer.nodes) layer.nodes = {};
    if (body && body.ref) layer.nodes.BODY = { ref: body.ref };
    if (goal && goal.ref) layer.nodes.GOAL = { ref: goal.ref };

    if (!layer.constraints) layer.constraints = [];
    if (!layer.paths) layer.paths = [];

    for (const path of layer.paths) {
      if (!path.optional) {
        const list = [];
        populateMatches(list, this, goal, body, layer.nodes, path.path, path, { BODY: body, GOAL: goal }, true);

        if (list.length) {
          requiredMatchLists.push(list);
        } else {
          return [];
        }
      }
      if (path.label) {
        provisionalPaths[path.label] = path.path;
      }
    }

    // Find variables from non-optional paths
    const requiredMatches = joinMatches(requiredMatchLists, layer.constraints);

    // Build combinations based on variables and all paths
    let allMatches = [];
    for (const match of requiredMatches) {
      const thisMatches = [[match]];

      for (const path of layer.paths) {
        if (path.optional) {
          const list = [];
          populateMatches(list, this, goal, body, layer.nodes, path.path, path, match, false);

          if (list.length) {
            thisMatches.push(list);
          }
        }

      }
      allMatches = allMatches.concat(joinMatches(thisMatches, layer.constraints));
    }

    const layers = [];

    for (const matches of allMatches) {
      layers.push(new MemoryLayer(matches, goal, body, provisionalPaths));
    }

    return layers;
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

class Node {

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

    if (this.data[firstLabel]) {
      const firstNode = this.data[firstLabel];

      if (path.length === 1) {
        return firstNode;
      } else {
        const nextLabels = label.substring(firstLabel.length + 1);
        return firstNode.get(nextLabels);
      }
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

}

class MemoryLayer {

  constructor(layer, goal, body, paths) {
    this.layer = layer;
    this.goal = goal;
    this.body = body;
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

    return this.body.get(label);
  }

  set(label, value) {
    if (this.paths[label]) {
      const path = this.paths[label];

      let node;
      if (path[0] === "BODY") {
        node = this.body;
      } else if (path[0] === "GOAL") {
        node = this.goal;
      } else if (this.layer[path[0]]) {
        node = this.layer[path[0]];
      }

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
          removeNode(this.layer[label]);
        }
      } else if (path.length === 2) {
        this.layer[path[0]].set(path[1], value);
      } else {
        console.log("ERROR: No deep set support for", label, "in memory layer");
      }
    } else {
      this.body.set(label, value);
    }
  }

  print() {
    console.log("=== memory layer ===");
    for (const key in this.layer) {
      const value = this.layer[key];

      if (typeof(value) === "number") {
        console.log(key + ":\t", value);
      } else if (value && value.path && value.ref) {
        console.log(key + ":\t", value.path, "#" + value.ref);
      } else {
        console.log(key + ":\t-");
      }
    }
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

function populateMatches(list, memory, goal, body, nodes, path, pathOptions, requiredMatch, isRequired) {
  if (pathOptions.provisional) {
    if (path.length !== 3) console.log("ERROR: No provisional support for path", path);

    let root;
    if (path[0] === "BODY") {
      root = body;
    } else if (path[0] === "GOAL") {
      root = goal;
    } else if (nodes[path[0]]) {
      root = memory.ref(nodes[path[0]].ref);
    }
    if (!root) console.log("ERROR: No provisional support for path", path, "in nodes", nodes);

    const leaves = memory.nodes.filter(node => isMatching(node, nodes[path[2]]));

    if (leaves.length) {
      for (const leaf of leaves) {
        if (requiredMatch && !isAcceptable(requiredMatch, path[0], root)) continue;
        if (requiredMatch && !isAcceptable(requiredMatch, path[2], leaf)) continue;

        const match = {};
        match[path[0]] = root;
        match[path[2]] = leaf;
        list.push(match);
      }
    } else {
      const leaf = new Node();
      populate(leaf, nodes[path[2]]);

      const match = {};
      match[path[0]] = root;
      match[path[2]] = leaf;
      list.push(match);
    }
  } else {
    let roots;
    if (path[0] === "BODY") {
      roots = [body];
    } else if (path[0] === "GOAL") {
      roots = [goal];
    } else {
      roots = memory.nodes.filter(node => isMatching(node, nodes[path[0]]));
    }

    for (const root of roots) {
      if (requiredMatch && !isAcceptable(requiredMatch, path[0], root)) continue;

      const match = {};
      match[path[0]] = root;

      let isMatchOk = true;
      let node = root;
      for (let i = 1; i < path.length - 1; i += 2) {
        node = node.get(path[i]);

        if (!node || !isMatching(node, nodes[path[i + 1]])) {
          isMatchOk = false;
          break;
        }

        if (requiredMatch && !isAcceptable(requiredMatch, path[i + 1], node)) {
          isMatchOk = false;
          break;
        }

        match[path[i + 1]] = node;
      }

      if (isMatchOk) {
        list.push(match);
      }
    }

    if (isRequired && (list.length === 1)) {
      const match = list[0];
      for (const label in match) {
        if (match[label].ref && nodes[label]&& !nodes[label].ref) {
          nodes[label] = { ref: match[label].ref };
        }
      }
    }
  }
}

function joinMatches(lists, constraints) {
  const matches = [];

  const index = [];
  for (const _ in lists) index.push(0);

  const variants = countVariants(lists);

  while (true) {
    let match = {};

    for (let i = 0; i < index.length; i++) {
      const list = lists[i];
      const listMatch = list[index[i]];
      const joinMatch = joinOneMatch(match, listMatch);

      if (joinMatch) {
        match = joinMatch;
      } else {
        match = null;
        break;
      }
    }

    if (match && isSatisfyingConstraints(match, variants, constraints)) {
      matches.push(match);
    }

    // Increment index
    for (let i = 0; i < index.length; i++) {
      index[i]++;
      if (index[i] < lists[i].length) break;
      index[i] = 0;
      if (i === index.length - 1) return matches;
    }
  }
}

function countVariants(lists) {
  const variants = {};

  for (const list of lists) {
    for (const match of list) {
      for (const key in match) {
        if (!variants[key]) variants[key] = {};
        const ref = match[key].ref;
        variants[key][ref] = true;
      }
    }
  }

  for (const key in variants) {
    variants[key] = Object.keys(variants[key]).length;
  }

  return variants;
}

function joinOneMatch(a, b) {
  const ab = {...a};

  for (const key in b) {
    if (!isAcceptable(a, key, b[key])) {
      return null;
    }

    ab[key] = b[key];
  }

  return ab;
}

function isMatching(object, template) {
  if (template["ref"]) return object.ref === template["ref"];
  for (const key in template) {
    if (object.get(key) !== template[key]) return false;
  }
  return true;
}

function isAcceptable(match, key, value) {
  return !match[key] || (match[key] === value);
}

function isSatisfyingConstraints(match, variants, constraints) {
  for (const c of constraints) {
    if (!isSatisfyingConstraint(c[0], match[c[0]], c[1], c[2], match[c[2]], variants)) return false;
  }

  return true;
}

function isSatisfyingConstraint(aLabel, aNode, constraint, bLabel, bNode, variants) {
  if (aNode && bNode) {
    if (constraint === "≠") {
      return (aNode !== bNode);
    } else if (constraint === "~") {
      if (aNode.ref < bNode.ref) return true;
      if (aNode.ref === bNode.ref) return (variants[aLabel] === 1) && (variants[bLabel] === 1);
      return false;
    }
  }

  return true;
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

function removeNode(node) {
  const index = node.memory.nodes.indexOf(node);

  if (index >= 0) {
    node.memory.nodes.splice(index, 1);

    for (const one of node.memory.nodes) {
      one.unlink(node);
    }
  }
}
