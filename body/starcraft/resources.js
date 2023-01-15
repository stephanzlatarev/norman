
export const RESOURCES = { 
  146: "mineral", 147: "mineral", 341: "mineral", 483: "mineral",
  665: "mineral", 666: "mineral", 796: "mineral", 797: "mineral",
  884: "mineral", 885: "mineral", 886: "mineral", 887: "mineral",
  342: "vespene", 343: "vespene", 344: "vespene",
  608: "vespene", 880: "vespene", 881: "vespene",
};

const knowns = {};

export function clusterResources(node, observation) {
  const clustersInMemory = node.memory.get(node.path + "/map/clusters");

  if (!clustersInMemory.links().length) {
    createClustersInMemory(node, clustersInMemory, observation);
  }

  refreshResourcesInMemory(observation, clustersInMemory);
  ensureNexusesAreLinkedToResources(node, clustersInMemory);
}

function ensureNexusesAreLinkedToResources(node, clustersInMemory) {
  for (const nexus of node.links()) {
    if ((nexus.get("unitType") === "nexus") && !nexus.get("resources")) {
      const nexusX = nexus.get("x");
      const nexusY = nexus.get("y");

      for (const cluster of clustersInMemory.links()) {
        const clusterX = cluster.get("x");
        const clusterY = cluster.get("y");

        if ((Math.abs(clusterX - nexusX) <= 10) && (Math.abs(clusterY - nexusY) <= 10)) {
          cluster.set("nexus", nexus);
          nexus.set("resources", cluster);
        }
      }
    }
  }
}

function refreshResourcesInMemory(observation, clustersInMemory) {
  if (observation.rawData.units.find(unit => RESOURCES[unit.unitType] && !knowns[unit.tag])) {
    for (const cluster of clustersInMemory.links()) {
      refreshClusterInMemory(observation, cluster);
    }
  }
}

function refreshClusterInMemory(observation, cluster) {
  for (const resource of cluster.links()) {
    const x = resource.get("x");
    const y = resource.get("y");
    const raw = observation.rawData.units.find(one => (one.pos.x === x) && (one.pos.y === y));

    if (!raw) {
      resource.remove();
    } else if (raw.tag !== resource.get("tag")) {
      resource.set("tag", raw.tag);
    }
  }
}

function createClustersInMemory(node, clustersInMemory, observation) {
  const resources = observation.rawData.units.filter(unit => RESOURCES[unit.unitType]);
  const clusters = findClusters(resources);

  for (const resource of resources) knowns[resource.tag] = true;

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const clusterInMemory = node.memory.get(clustersInMemory.path + "/" + i).set("type", "resources");

    let minX = 1000;
    let minY = 1000;
    let maxX = 0;
    let maxY = 0;

    for (let j = 0; j < cluster.length; j++) {
      const resource = cluster[j];
      const resourceInMemory = toNode(node, resource);

      clusterInMemory.set(j, resourceInMemory);

      minX = Math.min(minX, resource.pos.x);
      maxX = Math.max(maxX, resource.pos.x);
      minY = Math.min(minY, resource.pos.y);
      maxY = Math.max(maxY, resource.pos.y);
    }

    clusterInMemory.set("x", (maxX + minX) / 2);
    clusterInMemory.set("y", (maxY + minY) / 2);
  }
}

function toNode(node, unit) {
  return node.memory.get(node.path + "/" + unit.tag).set("unitType", RESOURCES[unit.unitType]).set("tag", unit.tag).set("x", unit.pos.x).set("y", unit.pos.y);
}

function findClusters(resources) {
  const clusters = [];

  for (const resource of resources) {
    const list = [];

    for (let i = clusters.length - 1; i >= 0; i--) {
      if (isResourceInCluster(resource, clusters[i])) {
        list.push(i);
      }
    }

    if (list.length === 0) {
      clusters.push([resource]);
    } else if (list.length === 1) {
      clusters[list[0]].push(resource);
    } else {
      let join = [resource];
      for (const i of list) {
        join = join.concat(clusters[i]);
        clusters.splice(i, 1);
      }
      clusters.push(join);
    }
  }

  return clusters;
}

function isResourceInCluster(resource, cluster) {
  const distance = 5;

  for (const object of cluster) {
    if ((Math.abs(object.pos.x - resource.pos.x) < distance) && (Math.abs(object.pos.y - resource.pos.y) < distance)) {
      return true;
    }
  }

  return false;
}
