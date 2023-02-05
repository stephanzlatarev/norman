import Map from "./map.js";
import { linkNexusToCluster } from "./structures.js";

export const RESOURCES = { 
  146: "mineral", 147: "mineral", 341: "mineral", 483: "mineral",
  665: "mineral", 666: "mineral", 796: "mineral", 797: "mineral",
  884: "mineral", 885: "mineral", 886: "mineral", 887: "mineral",
  1996: "mineral", 1997: "mineral", 1998: "mineral",
  342: "vespene", 343: "vespene", 344: "vespene",
  608: "vespene", 880: "vespene", 881: "vespene",
};

const knowns = {};

export async function observeResources(node, client, observation) {
  const clustersInMemory = node.memory.get(node.path + "/map/clusters");
  const basesInMemory = node.memory.get(node.path + "/map/bases");

  if (!clustersInMemory.links().length) {
    const map = new Map(await client.gameInfo(), observation);

    createClustersInMemory(node, clustersInMemory, map.clusters);
    createBasesInMemory(node, basesInMemory, map.bases);
  }

  refreshResourcesInMemory(observation, clustersInMemory);
  ensureNexusesAreLinkedToResources(node, clustersInMemory);
  ensureAssimilatorsAreLinkedToResources(node, clustersInMemory);
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

function ensureAssimilatorsAreLinkedToResources(node, clustersInMemory) {
  for (const assimilator of node.links()) {
    if ((assimilator.get("unitType") === "assimilator") && !assimilator.get("resources")) {
      const assimilatorX = assimilator.get("x");
      const assimilatorY = assimilator.get("y");

      for (const cluster of clustersInMemory.links()) {
        for (const resource of cluster.links().filter(resource => resource.get("unitType") === "vespene")) {
          const resourceX = resource.get("x");
          const resourceY = resource.get("y");
  
          if ((Math.abs(resourceX - assimilatorX) <= 1) && (Math.abs(resourceY - assimilatorY) <= 1)) {
            assimilator.set("resources", resource);
            resource.set("harvested", true);
          }
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

      clusterInMemory.set(resource.tag, node.memory.get(node.path + "/" + resource.tag).set("unitType", resource.type)
        .set("tag", resource.tag).set("x", resource.x).set("y", resource.y).set("harvested", false));
    }

    clusterInMemory.set("x", cluster.x);
    clusterInMemory.set("y", cluster.y);

    if (cluster.nexus) {
      clusterInMemory.set("nexusX", cluster.nexus.x);
      clusterInMemory.set("nexusY", cluster.nexus.y);
    }
  }
}

function createBasesInMemory(node, basesInMemory, bases) {
  for (const base of bases) {
    node.memory.get(basesInMemory.path + "/" + base.index).set("type", "base").set("x", base.x + base.w / 2).set("y", base.y + base.h / 2);
  }
}
