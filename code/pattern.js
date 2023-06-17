import Node from "./node.js";
import { EVENT_CREATE_NODE, EVENT_UPDATE_NODE, EVENT_DELETE_NODE } from "./codes.js";

// Memory patterns are used to watch for memory changes. Patterns are described by:
// - nodes - descriptors of memory nodes
// - paths - the required paths that connect the nodes
// - infos - the information we are interested in
export default class Pattern {

  constructor(memory, pattern) {
    this.memory = memory;
    this.nodes = pattern.nodes ? pattern.nodes : {};
    this.paths = pattern.paths ? pattern.paths : {};
    this.infos = parse(pattern.infos);
    this.troubleshoot = pattern.troubleshoot;

    this.labels = {};
    this.roots = {};
    this.shoots = {};
    this.procedures = {};
    this.delivery = [];

    buildLabels(this);
    buildRootsAndShoots(this);
    buildProcedures(memory, this);

    this.hasNotifications = !!firstSelection(this);
    this.consumedTime = 0;

    this.trace("init");
  }

  title(name) {
    this.name = name;
    return this;
  }

  fix(fixture) {
    if (this.fixture === fixture.match) return;

    if (fixture instanceof Match) {
      this.fixture = fixture.match;

      for (const nodeKey in this.shoots) {
        const node = this.fixture[nodeKey];

        if (node) {
          this.shoots[nodeKey].partial[node.ref] = node;

          const procedures = this.procedures[node.ref] ? this.procedures[node.ref] : addProceduresForNode(this, nodeKey, node);
          useProcedures(this, procedures, EVENT_CREATE_NODE, node);
        }
      }

      for (const nodeKey in this.roots) {
        if (!this.fixture[nodeKey]) continue;

        for (const rootKey in this.roots[nodeKey]) {
          for (const rootRef in this.shoots[rootKey].matches) {
            const match = this.shoots[rootKey].matches[rootRef];
            if (match[nodeKey]) {
              reviseShootMatch(this, rootKey, rootRef);
            }
          }
          for (const rootRef in this.shoots[rootKey].partial) {
            const match = this.shoots[rootKey].partial[rootRef];
            if (match[nodeKey]) {
              reviseShootMatch(this, rootKey, rootRef);
            }
          }
        }
      }
    }

    return this;
  }

  hasMatches() {
    return !!firstSelection(this);
  }

  [Symbol.iterator]() {
    this.trace("iterate");

    const pattern = this;
    const nodes = [... new Set(this.infos.map(info => info.node))];
    const paths = [... new Set(this.infos.map(info => info.path))];

    if (nodes.length + paths.length === 0) {
      // Nothing is requested as information
      return { next() { return { value: null, done: true } } };
    }

    let selection;
    return {
      next() {
        selection = selection ? rollSelection(pattern, selection) : firstSelection(pattern);

        const match = pattern.fixture ? { ...pattern.fixture, ...selection } : { ...selection };
        return {
          value: new Match(pattern, match),
          done: !selection,
        };
      }
    };
  }

  // If there's a single match for the pattern, then update all infos with the given values
  write(data) {
    if (!data || !data.length) return;

    for (let infoIndex = 0, valueIndex = 0; (infoIndex < this.infos.length) && (valueIndex < data.length); infoIndex++, valueIndex++) {
      const value = data[valueIndex];
      const info = this.infos[infoIndex];

      if (info.node) {
        if (info.length) {
          for (let i = 0; i < info.length; i++, valueIndex++) {
            writeValue(this, info.node, i, data[valueIndex]);
          }
          valueIndex--;
        } else if (info.label) {
          writeValue(this, info.node, info.label, value);
        } else {
          if (value) {
            pushNode(this, info.node);
          } else {
            removeNode(this, info.node);
          }
        }
      } else if (info.path) {
        if (value) {
          createPath(this, info.path);
        } else {
          removePath(this, info.path);
        }
      }
    }
  }

  listen(callback) {
    this.callback = callback;
    this.notifyListener();
    return this;
  }

  async notifyListener() {
    if (this.callback && this.hasNotifications) {
      const time = Date.now();

      if (this.callback.length) {
        let hasCalledCallbackNow = false;

        for (const match of this) {
          await this.callback(match.info());
          hasCalledCallbackNow = true;
        }

        if (hasCalledCallbackNow) {
          this.hasCalledCallbackWithMatches = true;
        } else if (this.hasCalledCallbackWithMatches) {
          await this.callback(null);
        }
      } else {
        await this.callback();
      }

      this.consumedTime += Date.now() - time;
      this.hasNotifications = false;
    }
  }

  onChange(type, node, label) {
    this.trace("change", type, node.label, node.ref, label);

    let procedures = this.procedures[node.ref];

    let shouldUpdateProcedures = (!procedures && (((type === EVENT_CREATE_NODE) || (type === EVENT_UPDATE_NODE)) && (!label || this.labels[label])))
      || ((type === EVENT_UPDATE_NODE) && procedures && !procedures[label]);

    if (shouldUpdateProcedures) {
      for (const key in this.nodes) {
        const template = this.nodes[key];
        if (label && (template[label] === undefined)) continue;
        if (!label && (template["label"] === undefined)) continue;

        if (node.match(template)) {
          procedures = addProceduresForNode(this, key, node);
        }
      }
    }

    if (procedures) {
      useProcedures(this, procedures, type, node, label);
    }
  }

  remove(object) {
    if (object === this) {
      this.memory.remove(this);
    }
  }

  trace() {
    if (this.troubleshoot) {
      console.log("[PATTERN]", ...arguments);
      console.log("Labels:", JSON.stringify(this.labels));
      console.log("Nodes:", JSON.stringify(this.nodes));
      console.log("Fixture:", JSON.stringify(this.fixture));
      console.log("Paths:", JSON.stringify(this.paths));
      console.log("Infos:", JSON.stringify(this.infos));
      console.log("Shoots:", JSON.stringify(this.shoots, null, 2));
      console.log("Roots:", JSON.stringify(this.roots, null, 2));
      console.log("Procedures:", JSON.stringify(this.procedures, null, 2));
      console.log();
    }
  }
}

class Match {

  constructor(pattern, match) {
    this.pattern = pattern;
    this.match = match;
  }

  key() {
    if (!this.hash) {
      const parts = [];
      for (const key in this.match) parts.push(this.match[key].ref);
      this.hash = parts.join("|");
    }

    return this.hash;
  }

  data() {
    const reading = [];

    if (this.pattern.infos && this.pattern.infos.length) {
      for (const info of this.pattern.infos) {
        const node = this.match[info.node];

        if (info.length) {
          reading.push(...node.values(info.length));
        } else if (info.label) {
          reading.push(normalize(node.get(info.label)));
        } else {
          // The information is that this node exists
          reading.push(1);
        }
      }
    }

    return reading;
  }

  info() {
    const reading = {};

    if (this.pattern.infos && this.pattern.infos.length) {
      for (const info of this.pattern.infos) {
        if (info.label) {
          reading[info.key] = normalize(this.match[info.node].get(info.label));
        } else {
          // The information is that this node exists
          reading[info.key] = 1;
        }
      }
    }

    return reading;
  }

  node(key) {
    return this.match[key];
  }

}

function parse(descriptor) {
  const list = [];
  let index = 0;

  for (const key in descriptor) {
    const item = descriptor[key];
    item.key = key;
    item.index = index++;
    list.push(item);
  }

  return list;
}

function buildLabels(pattern) {
  for (const key in pattern.nodes) {
    for (const label in pattern.nodes[key]) {
      if (label !== "label") {
        pattern.labels[label] = true;
      }
    }
  }
}

function buildRootsAndShoots(pattern) {
  const shootData = {};
  const nodeData = {};

  // Each node is a root, unless we later see there's a path where it's a shoot from another node
  for (const nodeKey in pattern.nodes) {
    shootData[nodeKey] = {};
    nodeData[nodeKey] = { isRoot: true, self: {}, roots: {}, shoots: {} };
    nodeData[nodeKey].self[nodeKey] = true;
  }

  // Traverse the paths to track all shoots
  for (const key in pattern.paths) {
    const path = pattern.paths[key];
    const firstNodeKey = path[0];

    if (!nodeData[firstNodeKey]) {
      shootData[firstNodeKey] = {};
      nodeData[firstNodeKey] = { isRoot: true, self: {}, roots: {}, shoots: {} };
      nodeData[firstNodeKey].self[firstNodeKey] = true;
    }

    const firstNodeData = nodeData[firstNodeKey];
    const rootNodeRoots = firstNodeData.isRoot ? firstNodeData.self : firstNodeData.roots;

    // Process paths by splitting into links between two nodes 
    for (let i = 0; i < path.length - 2; i += 2) {
      const firstNodeKey = path[i];
      const label = path[i + 1];
      const secondNodeKey = path[i + 2];

      if (!nodeData[secondNodeKey]) {
        shootData[secondNodeKey] = {};
        nodeData[secondNodeKey] = { self: {}, roots: {}, shoots: {} };
        nodeData[secondNodeKey].self[firstNodeKey] = true;
      }

      // Remember the shoot (<first-node>) -(<label>)-> (<second-node>)
      shootData[firstNodeKey][label] = secondNodeKey;

      // Remember that the nodes are shoots of the root node for this path
      for (const rootNodeKey in rootNodeRoots) {
        nodeData[rootNodeKey].shoots[firstNodeKey] = true;
        nodeData[rootNodeKey].shoots[secondNodeKey] = true;
        nodeData[secondNodeKey].roots[rootNodeKey] = true;
      }

      // Remember that the second node cannot be root
      nodeData[secondNodeKey].isRoot = false;

      // Transfer the shoots of the second node to the root node
      for (const shootNodeKey in nodeData[secondNodeKey].shoots) {
        for (const rootNodeKey in rootNodeRoots) {
          nodeData[rootNodeKey].shoots[shootNodeKey] = true;
        }
      }
    }
  }

  // Set the resulting roots and shoots to the pattern
  for (const nodeKey in nodeData) {
    const node = nodeData[nodeKey];

    if (node.isRoot) {
      const shoots = {};
      for (const key in node.shoots) {
        shoots[key] = shootData[key];
      }

      pattern.shoots[nodeKey] = {
        shoots: shoots,
        matches: {},
        partial: {},
      };
    } else {
      pattern.roots[nodeKey] = node.roots;
    }
  }
}

function buildProcedures(memory, pattern) {
  for (const key in pattern.nodes) {
    const selector = pattern.nodes[key];

    for (const node of memory.all(selector)) {
      const procedures = addProceduresForNode(pattern, key, node);
      useProcedures(pattern, procedures, EVENT_CREATE_NODE, node);
    }
  }
}

function addProceduresForNode(pattern, nodeKey, node) {
  let procedures = pattern.procedures[node.ref];

  if (!procedures) {
    procedures = {};
    pattern.procedures[node.ref] = procedures;
  }

  // Matching procedures
  if (pattern.shoots[nodeKey]) {
    // For when deleting the node
    procedures[undefined] = addProcedure(procedures[undefined], { type: "match", rootKey: nodeKey, nodeKey: nodeKey });

    // For when updating a value
    for (const label in pattern.nodes[nodeKey]) {
      if (label !== "label") {
        procedures[label] = addProcedure(procedures[label], { type: "match", rootKey: nodeKey, nodeKey: nodeKey });
      }
    }

    // For when updating a link
    for (const label in pattern.shoots[nodeKey].shoots[nodeKey]) {
      procedures[label] = addProcedure(procedures[label], { type: "match", rootKey: nodeKey, nodeKey: nodeKey });
    }
  }
  if (pattern.roots[nodeKey]) {
    for (const rootNodeKey in pattern.roots[nodeKey]) {
      const shoots = pattern.shoots[rootNodeKey].shoots[nodeKey];

      for (const label in shoots) {
        procedures[label] = addProcedure(procedures[label], { type: "match", rootKey: rootNodeKey, nodeKey: nodeKey });
      }
    }
  }

  // Info changing procedures
  for (let index = 0; index < pattern.infos.length; index++) {
    const info = pattern.infos[index];

    if (info.node === nodeKey) {
      procedures[undefined] = addProcedure(procedures[undefined], { type: "infos", index: index });

      if (info.label) {
        procedures[info.label] = addProcedure(procedures[info.label], { type: "infos", index: index });
      }
    }
  }

  return procedures;
}

function addProcedure(list, procedure) {
  if (!list) list = [];
  list.push(procedure);
  return list;
}

function useProcedures(pattern, procedures, eventType, node, label) {
  procedures = procedures[label];
  if (!procedures) return;

  for (const procedure of procedures) {
    pattern.trace("procedure", procedure);

    if (procedure.type === "match") {
      const root = pattern.shoots[procedure.rootKey];

      if (procedure.rootKey === procedure.nodeKey) {
        if (eventType === EVENT_CREATE_NODE) {
          root.partial[node.ref] = {};
          root.partial[node.ref][procedure.nodeKey] = node;

          reviseShootMatch(pattern, procedure.rootKey, node.ref);
        } else if (eventType === EVENT_UPDATE_NODE) {
          if (!root.matches[node.ref] && !root.partial[node.ref]) {
            root.partial[node.ref] = {};
            root.partial[node.ref][procedure.nodeKey] = node;
          }

          reviseShootMatch(pattern, procedure.rootKey, node.ref);
        } else if (eventType === EVENT_DELETE_NODE) {
          delete root.matches[node.ref];
          delete root.partial[node.ref];
          delete pattern.procedures[node.ref];
        }
      } else {
        // Revise complete matches where this node appears
        for (const ref in root.matches) {
          if (root.matches[ref][procedure.nodeKey] === node) {
            reviseShootMatch(pattern, procedure.rootKey, ref);
          }
        }

        // Revise partial matches where this node appears
        for (const ref in root.partial) {
          if (root.partial[ref][procedure.nodeKey] === node) {
            reviseShootMatch(pattern, procedure.rootKey, ref);
          }
        }
      }
    } else if (procedure.type === "infos") {
      // TODO: Make sure that this node is part of a complete match
      pattern.hasNotifications = true;
    }
  }
}

function reviseShootMatch(pattern, rootKey, rootRef) {
  const root = pattern.shoots[rootKey];
  const shoots = root.shoots;
  const matches = root.matches[rootRef];
  const partial = root.partial[rootRef];

  // TODO: Remember the state in the match. Then revise by following the links and find deltas. For each delta, update the affected procedures - remove old, add new
  const master = matches ? matches : partial;
  const draft = {};

  constructShootMatch(pattern, draft, shoots, rootKey, master[rootKey]);

  if (!draft[rootKey]) {
    // If the root node is no longer a match, then delete all its known matches
    delete root.matches[rootRef];
    delete root.partial[rootRef];
    pattern.hasNotifications = true;
  } else if (partial) {
    // If match was partial and is now complete, then move it to matches
    if (isMatchComplete(shoots, draft)) {
      root.matches[rootRef] = draft;
      delete root.partial[rootRef];

      // TODO: This is a complete match for the shoot but maybe partial match for the pattern
      // Check if match is complete for the pattern before sending the notification
      pattern.hasNotifications = true;
    }
  } else {
    // If match was complete but is now partial, then move it to partial
    if (!isMatchComplete(shoots, draft)) {
      root.partial[rootRef] = draft;
      delete root.matches[rootRef];
      pattern.hasNotifications = true;
    }
  }
}

function constructShootMatch(pattern, match, shoots, key, node) {
  if (pattern.nodes[key] && !node.match(pattern.nodes[key])) return;

  match[key] = node;

  for (const label in shoots[key]) {
    const shootKey = shoots[key][label];
    const shootNode = node.get(label);

    if (shootNode instanceof Node) {
      if (pattern.fixture && pattern.fixture[shootKey] && (shootNode !== pattern.fixture[shootKey])) {
        // Shoot node doesn't match the fixture for the pattern
        continue;
      }

      constructShootMatch(pattern, match, shoots, shootKey, shootNode);
    }
  }
}

function isMatchComplete(shoots, match) {
  let isComplete = true;

  for (const key in shoots) {
    if (!match[key]) {
      isComplete = false;
      break;
    }
  }

  return isComplete;
}

function firstSelection(pattern) {
  let selection = {};

  for (const key in pattern.shoots) {
    const matches = pattern.shoots[key].matches;
    let thereIsAtLeastOneMatch = false;

    for (const matchKey in matches) {
      addMatchToSelection(matches[matchKey], selection);
      thereIsAtLeastOneMatch = true;
      break;
    }

    if (!thereIsAtLeastOneMatch) {
      return null;
    }
  }

  return selection;
}

function rollSelection(pattern, selection) {
  if (!selection) return null;

  let ok = false;

  for (const key in pattern.shoots) {
    const matches = pattern.shoots[key].matches;
    const nodeRef = selection[key].ref;

    let firstRef;
    let nextRef;
    let nextRefComes = false;

    for (const keyRef in matches) {
      const ref = Number(keyRef);
      if (!firstRef) firstRef = ref;
      if (nextRefComes) {
        nextRef = ref;
        break;
      }
      if (ref === nodeRef) nextRefComes = true;
    }

    if (nextRef) {
      addMatchToSelection(matches[nextRef], selection);
      ok = true;
      break;
    } else {
      addMatchToSelection(matches[firstRef], selection);
      ok = false;
    }
  }

  return ok ? selection : null;
}

// TODO: Currently doesn't check for conflicts. Must check. Add tests
function addMatchToSelection(match, selection) {
  for (const nodeKey in match) {
    selection[nodeKey] = match[nodeKey];
  }
}

function normalize(value) {
  if (value instanceof Node) {
    return 1;
  }

  return (value >= 0) ? value : 0;
}

function writeValue(pattern, nodeKey, label, value) {
  const node = pushNode(pattern, nodeKey);

  if (node instanceof Node) {
    node.set(label, value);
  }
}

function createPath(pattern, pathKey) {
  const path = pattern.paths[pathKey];

  if (path) {
    const fromNode = pushNode(pattern, path[0]);

    if (fromNode) {
      const linkLabel = path[1];
      const toNode = pushNode(pattern, path[2]);

      if (toNode) {
        fromNode.set(linkLabel, toNode);
      }
    }
  }
}

function removePath(pattern, pathKey) {
  const path = pattern.paths[pathKey];

  if (path) {
    const fromNode = getNode(pattern, path[0]);
    const linkLabel = path[1];

    if (fromNode) {
      fromNode.clear(linkLabel);
    }
  }
}

function createNode(pattern, nodeKey) {
  const descriptor = pattern.nodes[nodeKey];

  if (descriptor) {
    let node = pattern.memory.add(descriptor.label ? descriptor.label : "#" + Math.random());
  
    for (const label in descriptor) {
      if (label !== "label") {
        node.set(label, descriptor[label]);
      }
    }

    return node;
  } else {
    // The key is a label
    return pattern.memory.add(nodeKey);
  }
}

function removeNode(pattern, nodeKey) {
  const node = getNode(pattern, nodeKey);

  if (node instanceof Node) {
    pattern.memory.remove(node);
  }
}

function pushNode(pattern, nodeKey) {
  const node = getNode(pattern, nodeKey);

  if (node instanceof Node) {
    return node;
  } else if (node !== "multiples") {
    return createNode(pattern, nodeKey);
  }
}

function getNode(pattern, nodeKey) {
  const node = pattern.nodes[nodeKey];

  if (node) {
    const shoots = findShoots(pattern, nodeKey); // ??? Or pattern.shoots[nodeKey]

    let instance = findSingleInstance(shoots.matches, nodeKey);

    if (!instance) {
      instance = findSingleInstance(shoots.partial, nodeKey);
    }

    return instance;
  } else if (pattern.fixture) {
    return pattern.fixture[nodeKey];
  }
}

function findSingleInstance(matches, nodeKey) {
  let instance;

  if (matches) {
    for (const key in matches) {
      if (instance) return "multiples";
      instance = matches[key][nodeKey];
    }
  }

  return instance;
}

function findShoots(pattern, nodeKey) {
  if (pattern.shoots[nodeKey]) {
    return pattern.shoots[nodeKey];
  } else if (pattern.roots[nodeKey]) {
    for (const rootKey in pattern.roots[nodeKey]) {
      if (pattern.shoots[rootKey]) {
        return pattern.shoots[rootKey];
      }
    }
  }
}
