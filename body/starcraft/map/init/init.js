import Board from "../board.js";
import Cluster from "./cluster.js";
import { setBorder } from "./borders.js";
import { setCenter } from "./centers.js";
import { dissolveInvalidCurtains, separateCurtains } from "./curtains.js";
import { separateCurtainDepots, separateGroundDepots } from "./depots.js";
import { addSkirt, validateGround } from "./grounds.js";
import { separateHalls } from "./halls.js";
import { separateTerrainHeights } from "./heights.js";
import { expandHomebase } from "./homebase.js";
import { separateIslands } from "./islands.js";
import { initNames } from "./names.js";
import { initNeighbors } from "./neighbors.js";
import { dissolvePatches } from "./patches.js";
import { initSectors } from "./sectors.js";
import { validateRamp } from "./ramps.js";
import { createSites } from "./sites.js";
import { adjustCellsToUnits, getStartLocation } from "./units.js";
import { createZones } from "./zones.js";

export default function(gameInfo) {
  Board.create(gameInfo);

  initSectors();
  adjustCellsToUnits();

  const clusters = new Set([new Cluster(Board.board)]);
  const homebase = getStartLocation() || { x: 0, y: 0 };
  const isHomebase = cluster => cluster.isDepot && (cluster.x === homebase.x) && (cluster.y === homebase.y);

  processClusters(clusters, separateTerrainHeights);
  processClusters(clusters, separateCurtains, cluster => cluster.isGround);
  processClusters(clusters, separateIslands);
  processClusters(clusters, validateRamp, cluster => cluster.isRamp);
  processClusters(clusters, validateGround, cluster => cluster.isGround);
  processClusters(clusters, separateGroundDepots, cluster => cluster.isGround);
  processClusters(clusters, separateCurtainDepots, cluster => cluster.isCurtain);
  processClusters(clusters, expandHomebase, isHomebase);
  processClusters(clusters, separateIslands, cluster => cluster.isGround);
  processClusters(clusters, separateHalls, cluster => cluster.isGround);
  for (const one of clusters) if (one.isAir) clusters.delete(one);
  processClusters(clusters, setCenter, cluster => !cluster.isPatch);
  dissolveInvalidCurtains(clusters);
  dissolvePatches(clusters);
  processClusters(clusters, setBorder);
  initNeighbors(clusters);
  initNames(clusters);
  processClusters(clusters, addSkirt);
  createZones(clusters);
  createSites();
}

function processClusters(clusters, transform, filter) {
  const result = new Set();

  for (const cluster of clusters) {
    if (!filter || filter(cluster)) {
      const split = transform(cluster, clusters);

      if (split instanceof Cluster) {
        addCluster(result, cluster, split);
      } else if (split) {
        for (const one of split) {
          addCluster(result, cluster, one);
        }
      }
    } else if (cluster.cells.size) {
      result.add(cluster);
    }
  }

  if (result.size) {
    clusters.clear();

    for (const cluster of result) clusters.add(cluster);
  }
}

function addCluster(set, parent, child) {
  const cluster = createCluster(parent, child);

  if (cluster.cells.size) {
    set.add(cluster);
  }
}

function createCluster(parent, cluster) {
  if (cluster === parent) {
    return parent;
  } else if (cluster instanceof Cluster) {
    return cluster;
  } else {
    return parent.derive(cluster);
  }
}
