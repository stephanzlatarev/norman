import Layer from "./layer.js";
import Node from "./node.js";

export default function(memory, layer) {
  const nodes = layer.nodes ? { ...layer.nodes } : {};
  const constraints = layer.constraints ? [...layer.constraints] : [];
  const paths = layer.paths ? [...layer.paths] : [];

  const matches = [];
  const labeledPaths = {};

  for (const one of paths) {
    const path = one.path;

    let thisMatches;

    if (path.length === 1) {
      thisMatches = getMatchingNodes(memory, nodes[path[0]]).map(node => createMatchWithOneLabel(path[0], node));
    } else if (path.length === 3) {
      if (one.provisional) {
        thisMatches = getProvisionalMatches(memory, nodes, ...path, one.unique);
      } else if (one.optional) {
        thisMatches = getOptionalMatches(memory, nodes, ...path);
      } else {
        thisMatches = getRequiredMatches(memory, nodes, ...path);
      }
    }

    if (!thisMatches || !thisMatches.length) {
      if (TROUBLESHOOTING) console.log("No match for path:", JSON.stringify(one));
      return [];
    } else if ((thisMatches.length === 1) && !one.optional && (!one.provisional || one.unique)) {
      const match = thisMatches[0];
      for (const label in match) {
        if (match[label] !== nodes[label]) {
          nodes[label] = match[label];
        }
      }
    }

    if (one.label) {
      labeledPaths[one.label] = path;
    }

    matches.push(thisMatches);
  }

  const layers = [];

  for (const match of joinMatches(nodes, matches, constraints)) {
    layers.push(new Layer(match, labeledPaths));
  }

  showLayersWhenTroubleshooting(paths, matches, layers);

  return layers;
}

function getMatchingNodes(memory, template) {
  if (template instanceof Node) {
    return [template];
  } else {
    return memory.nodes.filter(node => isMatching(node, template));
  }
}

function getProvisionalMatches(memory, nodes, labelRoot, _, labelLeaf, unique) {
  const list = [];

  for (const root of getMatchingNodes(memory, nodes[labelRoot])) {
    const leafTemplate = nodes[labelLeaf];
    let hasMatchForTemplate = false;

    if (leafTemplate) {
      if (leafTemplate instanceof Node) {
        addMatchIfAcceptable(nodes, list, labelRoot, root, labelLeaf, leafTemplate);
        hasMatchForTemplate = true;
      } else {
        const leaves = memory.nodes.filter(node => isMatching(node, leafTemplate));
  
        if (leaves.length) {
          for (const leaf of leaves) {
            addMatchIfAcceptable(nodes, list, labelRoot, root, labelLeaf, leaf);
          }
        } else {
          addMatchIfAcceptable(nodes, list, labelRoot, root, labelLeaf, templateToNode(leafTemplate));
          hasMatchForTemplate = true;
        }
      }
    }

    // Also, add the possibility for no match
    if ((!unique || !list.length) && !hasMatchForTemplate && (labelRoot !== labelLeaf)) {
      addMatch(list, labelRoot, root, labelLeaf, templateToNode(leafTemplate));
    }
  }

  return list;
}

function getOptionalMatches(memory, nodes, labelRoot, labelLink, labelLeaf) {
  const list = [];
  const leaves = {};

  for (const root of getMatchingNodes(memory, nodes[labelRoot])) {
    const matchingLeaves = getMatchingLinkedNodes(nodes, root, labelLink, labelLeaf);

    if (matchingLeaves) {
      for (const leaf of matchingLeaves) {
        leaves[leaf.ref] = true;
        addMatch(list, labelRoot, root, labelLeaf, leaf);
      }
    } else {
      addMatch(list, labelRoot, root, labelLeaf, null);
    }
  }

  for (const leaf of getMatchingNodes(memory, nodes[labelLeaf])) {
    if (!leaves[leaf.ref]) {
      addMatch(list, labelRoot, null, labelLeaf, leaf);
    }
  }

  return list;
}

function getRequiredMatches(memory, nodes, labelRoot, labelLink, labelLeaf) {
  const list = [];

  for (const root of getMatchingNodes(memory, nodes[labelRoot])) {
    let matchingLeaves = getMatchingLinkedNodes(nodes, root, labelLink, labelLeaf);

    if (matchingLeaves) {
      for (const leaf of matchingLeaves) {
        addMatchIfAcceptable(nodes, list, labelRoot, root, labelLeaf, leaf);
      }
    }
  }

  return list;
}

function createMatchWithOneLabel(label, node) {
  const result = {};
  result[label] = node;
  return result;
}

function addMatch(list, label1, node1, label2, node2) {
  const match = {};
  match[label1] = node1;
  match[label2] = node2;
  list.push(match);
}

function addMatchIfAcceptable(nodes, list, label1, node1, label2, node2) {
  if (isAcceptable(nodes, label1, node1) && isAcceptable(nodes, label2, node2)) {
    addMatch(list, label1, node1, label2, node2);
  }
}

function isMatching(node, template) {
  if (!node || !template) {
    return ((!node || ((node instanceof Node) && !node.memory)) && !template);
  }

  if (template instanceof Node) {
    return (node === template);
  }

  for (const key in template) {
    if (node.get(key) !== template[key]) return false;
  }

  return true;
}

function isAcceptable(collection, label, node) {
  return (collection[label] === undefined) || isMatching(node, collection[label]);
}

function getMatchingLinkedNodes(nodes, node, pathLink, pathChild) {
  if (pathLink === "*") {
    const matches = [];
    for (const label in node.data) {
      if (node.get(label) instanceof Node) {
        const list = getMatchingLinkedNodes(nodes, node, label, pathChild);
        if (list) {
          for (const one of list) matches.push(one);
        }
      }
    }
    return matches.length ? matches : null;
  } else {
    const match = node.get(pathLink);

    if (!match || !isMatching(match, nodes[pathChild])) return;
    if (!isAcceptable(nodes, pathChild, match)) return;

    return [match];
  }
}

function templateToNode(template) {
  if (template instanceof Node) {
    return template;
  } else {
    const node = new Node();

    for (const label in template) {
      node.set(label, template[label]);
    }

    return node;
  }
}

function joinMatches(nodes, lists, constraints) {
  let workingMatches = [{}];

  // Populate starting match with the fixed nodes
  for (const label in nodes) {
    if (nodes[label] instanceof Node) {
      workingMatches[0][label] = nodes[label];
    }
  }

  for (const list of lists) {
    const extendedMatches = [];

    for (const match of workingMatches) {
      for (const extension of getExtensions(match, list)) {
        extendedMatches.push(getExtendedMatch(match, extension));
      }
    }

    workingMatches = extendedMatches;
  }

  const matches = [];

  for (const match of workingMatches) {
    if (isSatisfyingConstraints(match, constraints, lists)) {
      matches.push(match);
    }
  }

  return matches;
}

function getExtensions(match, list) {
  const extensions = [];

  for (const one of list) {
    let isMatching = true;

    for (const label in one) {
      if (!isAcceptable(match, label, one[label])) {
        isMatching = false;
        break;
      }
    }

    if (isMatching) {
      extensions.push(one);
    }
  }

  return extensions;
}

function getExtendedMatch(match, extension) {
  const result = {...match};

  for (const label in extension) {
    result[label] = extension[label];
  }

  return result;
}

function isSatisfyingConstraints(match, constraints, lists) {
  for (const c of constraints) {
    if (!isSatisfyingConstraint(c[0], match[c[0]], c[1], c[2], match[c[2]], lists)) return false;
  }

  return true;
}

function isSatisfyingConstraint(aLabel, aNode, constraint, bLabel, bNode, lists) {
  if (aNode && bNode) {
    if (constraint === "≠") {
      return (aNode !== bNode);
    } else if (constraint === "~") {
      if (aNode.ref < bNode.ref) return true;
      if (aNode === bNode) {
        return isOnlyChoice(aLabel, aNode, lists) && isOnlyChoice(bLabel, aNode, lists);
      }
      return false;
    }
  }

  return true;
}

function isOnlyChoice(label, node, lists) {
  for (const list of lists) {
    if (!isOnlyChoiceInList(label, node, list)) return false;
  }

  return true;
}

function isOnlyChoiceInList(label, node, list) {
  const pattern = getPatternOfList(label, node, list);

  if (pattern) {
    let count = 0;

    for (const match of list) {
      if (isMatchingPattern(match, pattern)) count++;
    }

    return (count === 1);
  }

  return true;
}

function getPatternOfList(label, node, list) {
  for (const match of list) {
    if (match[label] === node) {
      const pattern = {...match};
      delete pattern[label];
      return pattern;
    }
  }

  return null;
}

function isMatchingPattern(match, pattern) {
  for (const label in pattern) {
    if (match[label] !== pattern[label]) return false;
  }
  return true;
}

////////////////////////////////////////////////////////////////

const TROUBLESHOOTING = false;

function showLayersWhenTroubleshooting(paths, matches, layers) {
  if (TROUBLESHOOTING) {
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const pathMatches = matches[i];

      console.log("===", path.path, "===", path.provisional ? "provisional" : "", path.optional ? "optional" : "");
      for (const match of pathMatches) {
        const line = [];
        for (const label in match) {
          line.push(label + ": " + (match[label] ? match[label].path : "x"));
        }
        console.log(line.join(", "));
      }
    }

    for (const layer of layers) {
      layer.print();
    }
  }
}
