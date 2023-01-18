import { resources, map, prefix, plot, store } from "./maps.js";

const time = new Date().getTime();

const clusters = clusterResources();
const nexuses = clusters.map(cluster => findNexusLocation(cluster));
store({
  clusters: clusters.map(cluster => ({ code: cluster.code, x: cluster.x, y: cluster.y })),
  nexuses: nexuses,
});

store({ bases: nexuses.map(nexus => findBasePlot(nexus)) });

function clusterResources() {
  const clusters = findClusters(resources());
  const result = [];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];

    let minX = 1000;
    let minY = 1000;
    let maxX = 0;
    let maxY = 0;

    for (let j = 0; j < cluster.length; j++) {
      const resource = cluster[j];

      minX = Math.min(minX, resource.x);
      maxX = Math.max(maxX, resource.x);
      minY = Math.min(minY, resource.y);
      maxY = Math.max(maxY, resource.y);
    }

    const x = (maxX + minX) / 2;
    const y = (maxY + minY) / 2;
    result.push({
      code: x + " " + y,
      resources: cluster,
      x: Math.floor(x),
      y: Math.floor(y),
    });
  }

  return result;
}

function findClusters(resources) {
  const clusters = [];

  for (const raw of resources) {
    const resource = { x: raw.pos.x, y: raw.pos.y };
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
  const distance = 10;

  for (const object of cluster) {
    if ((Math.abs(object.x - resource.x) < distance) && (Math.abs(object.y - resource.y) < distance)) {
      return true;
    }
  }

  return false;
}

function findNexusLocation(cluster) {
  const clusterX = Math.floor(cluster.x);
  const clusterY = Math.floor(cluster.y);
  const plotMinX = clusterX - 20;
  const plotMinY = clusterY - 20;
  const plotMaxW = 40;
  const plotMaxH = 40;
  const data = prefix(map({ harvest: 1, units: 1 }), plotMinX, plotMinY, plotMaxW, plotMaxH);
  const slot = plot(data, 5, 5, plotMinX, plotMinY, plotMinX + plotMaxW, plotMinY + plotMaxH, clusterX, clusterY);

  return { x: slot.x + 2.5, y: slot.y + 2.5 };
}

function findBasePlot(nexus) {
  const nexusX = Math.floor(nexus.x);
  const nexusY = Math.floor(nexus.y);
  const plotMinX = nexusX - 20;
  const plotMinY = nexusY - 20;
  const plotMaxW = 40;
  const plotMaxH = 40;
  const data = prefix(map({ nexuses: 1, units: 1 }), plotMinX, plotMinY, plotMaxW, plotMaxH);

  return plot(data, 8, 8, plotMinX, plotMinY, plotMinX + plotMaxW, plotMinY + plotMaxH, nexusX, nexusY);
}

console.log("Used", (new Date().getTime() - time), "millis");
