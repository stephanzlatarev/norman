import Map from "./map.js";
import { linkNexusToCluster } from "./structures.js";

export const RESOURCES = { 
  146: "mineral", 147: "mineral", 341: "mineral", 483: "mineral",
  665: "mineral", 666: "mineral", 796: "mineral", 797: "mineral",
  884: "mineral", 885: "mineral", 886: "mineral", 887: "mineral",
  342: "vespene", 343: "vespene", 344: "vespene",
  608: "vespene", 880: "vespene", 881: "vespene",
};

const knowns = {};

export async function observeResources(node, client, observation) {
  const clustersInMemory = node.memory.get(node.path + "/map/clusters");

  if (!clustersInMemory.links().length) {
    const map = new Map(await client.gameInfo(), observation);

    createClustersInMemory(node, clustersInMemory, map.clusters);
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
          linkNexusToCluster(nexus, cluster);
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

function createClustersInMemory(node, clustersInMemory, clusters) {
  for (const cluster of clusters) {
    const clusterInMemory = node.memory.get(clustersInMemory.path + "/" + cluster.index).set("type", "resources");

    for (const resource of cluster.resources) {
      knowns[resource.tag] = true;

      clusterInMemory.set(resource.tag, toNode(node, resource));
    }

    clusterInMemory.set("x", cluster.x);
    clusterInMemory.set("y", cluster.y);

    if (cluster.nexus) {
      clusterInMemory.set("nexusX", cluster.nexus.x);
      clusterInMemory.set("nexusY", cluster.nexus.y);
    }

    if (cluster.base) {
      clusterInMemory.set("baseX", cluster.base.x);
      clusterInMemory.set("baseY", cluster.base.y);
    }
  }
}

function toNode(node, resource) {
  return node.memory.get(node.path + "/" + resource.tag).set("unitType", resource.type).set("tag", resource.tag).set("x", resource.x).set("y", resource.y);
}
