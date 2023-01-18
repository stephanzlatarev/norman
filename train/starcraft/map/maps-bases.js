import { minerals, vespenes, map, prefix, plot, store } from "./maps.js";

const time = new Date().getTime();

const clusters = clusterResources(findClusters(minerals(), vespenes()));
console.log("Clusters:", clusters.length);

const nexuses = clusters.map(cluster => findNexusLocation(cluster));
store({
  clusters: clusters.map(cluster => ({ code: cluster.code, x: cluster.x, y: cluster.y })),
  nexuses: nexuses,
});

store({ bases: nexuses.map(nexus => findBasePlot(nexus)) });

function clusterResources(clusters) {
  const result = [];

  for (const cluster of clusters) {
    let minX = 1000;
    let minY = 1000;
    let maxX = 0;
    let maxY = 0;

    for (const resource of cluster) {
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

function findClusters(minerals, vespenes) {
  let clusters = [];

  for (const raw of minerals) {
    const resource = { x: raw.pos.x, y: raw.pos.y };

    const list = [];

    for (const cluster of clusters) {
      if (isResourceInCluster(resource, cluster)) {
        list.push(cluster);
      }
    }

    if (list.length === 0) {
      clusters.push([resource]);
    } else if (list.length === 1) {
      list[0].push(resource);
    } else {
      let join = [resource];
      for (const cluster of list) {
        join = join.concat(cluster);
      }

      let newClusters = [join];
      for (const cluster of clusters) {
        if (list.indexOf(cluster) < 0) {
          newClusters.push(cluster);
        }
      }
      clusters = newClusters;
    }
  }

  for (const cluster of clusters) {
    for (const raw of vespenes) {
      const resource = { x: raw.pos.x, y: raw.pos.y };

      if (isResourceInCluster(resource, cluster)) {
        cluster.push(resource);
      }
    }
  }

  return clusters;
}

function isResourceInCluster(resource, cluster) {
  const distance = 6;

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
  const plotMinX = nexusX - 12;
  const plotMinY = nexusY - 12;
  const plotMaxW = 24;
  const plotMaxH = 24;
  const data = prefix(map({ nexuses: 1, units: 1 }), plotMinX, plotMinY, plotMaxW, plotMaxH);

  return plot(data, 8, 8, plotMinX, plotMinY, plotMinX + plotMaxW, plotMinY + plotMaxH, nexusX, nexusY);
}

console.log("Used", (new Date().getTime() - time), "millis");
