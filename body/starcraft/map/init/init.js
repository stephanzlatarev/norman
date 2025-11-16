import Board from "../board.js";
import Cluster from "./cluster.js";
import { setCenter } from "./centers.js";
import { separateCurtains } from "./curtains.js";
import { separateCurtainDepots, separateGroundDepots } from "./depots.js";
import { validateGround } from "./grounds.js";
import { separateHalls } from "./halls.js";
import { separateTerrainHeights } from "./heights.js";
import { expandHomebase } from "./homebase.js";
import { separateIslands } from "./islands.js";
import { initNames } from "./names.js";
import { dissolvePatches } from "./patches.js";
import { initSectors, separateSectors } from "./sectors.js";
import { validateRamp } from "./ramps.js";
import { adjustCellsToUnits, getStartLocation } from "./units.js";

export default function(gameInfo) {
  const time = Date.now();

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
  processClusters(clusters, separateSectors, cluster => cluster.isAir);
  processClusters(clusters, setCenter, cluster => !cluster.isPatch);
  dissolvePatches(clusters);
  initNames(clusters);

  const elapsed = Date.now() - time;
  console.log(`Map created in ${elapsed} ms`);

  // WIP: BEGIN TRACING
  const chooseColor = (cluster) => {
    const a = Math.floor(Math.random() * 150);
    const b = Math.floor(Math.random() * 150);
    if (cluster.isAir) return "red"; //`rgb(255,${a},${b})`;
    if (cluster.isDepot) return `rgb(${a},255,255)`;
    if (cluster.isGround) return `rgb(${a},255,${b})`;
    if (cluster.isCurtain) return `rgb(${a},${b},255)`;
    if (cluster.isRamp) return `rgb(${a},${b},255)`;
    if (cluster.isPatch) return `rgb(255,255,${b})`;
    return "rgb(255,255,255)";
  };
  const isBorder = function(cell) {
    for (const one of cell.rim) {
      if (one.color !== cell.color) {
        return true;
      }
    }
  };
  for (const cluster of clusters) {
    let color = chooseColor(cluster);
    for (const cell of cluster.cells) {
      cell.color = color;
    }
    if (cluster.x && cluster.y) {
      Board.cell(cluster.x, cluster.y).pin = { x: cluster.x, y: cluster.y };
    }
  }
  for (const cluster of clusters) {
    for (const cell of cluster.cells) {
      cell.isBorder = isBorder(cell);
    }
  }

  console.log("Total clusters:", clusters.size);
  console.log(" -   Depots:", [...clusters].filter(c => c.isDepot).length);
  console.log(" -  Grounds:", [...clusters].filter(c => c.isGround).length);
  console.log(" -    Ramps:", [...clusters].filter(c => c.isRamp).length);
  console.log(" -      Air:", [...clusters].filter(c => c.isAir).length);
  console.log(" - Curtains:", [...clusters].filter(c => c.isCurtain).length);
  console.log(" -  Patches:", [...clusters].filter(c => c.isPatch).length);
  console.log(" -    Empty:", [...clusters].filter(c => c.isEmpty).length);
  // WIP: END TRACING

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
