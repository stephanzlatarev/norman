import Corridor from "../corridor.js";

export function initNeighbors(clusters) {
  const exits = centerExitCells(mapExitCells(clusters));

  for (const cluster of clusters) {
    cluster.exits = new Map();
    cluster.neighbors = new Set();
  }

  // Direct corridors between depot and ground zones
  for (const [cluster, neighbors] of exits) {
    if (!cluster.isDepot && !cluster.isGround) continue;

    for (const [neighbor, exit] of neighbors) {
      if (!neighbor.isDepot && !neighbor.isGround) continue;
      if (cluster.exits.has(neighbor)) continue;

      const path = [cluster.center, exit, neighbor.center];
      const corridor = neighbor.exits.get(cluster) || new Corridor("ground", path);

      cluster.exits.set(neighbor, corridor);
      cluster.neighbors.add(neighbor);

      neighbor.exits.set(cluster, corridor);
      neighbor.neighbors.add(cluster);
    }
  }

  // Indirect corridors
  for (const [cluster, neighbors] of exits) {
    if (!cluster.isDepot && !cluster.isGround) continue;

    for (const [neighbor, exit] of neighbors) {
      if (!neighbor.isCurtain && !neighbor.isRamp) continue;

      const type = getCorridorType(neighbor);

      for (const [destination, destExit] of exits.get(neighbor)) {
        if (destination === cluster) continue;
        if (!destination.isDepot && !destination.isGround) continue;
        if (cluster.exits.has(destination)) continue;

        const path = [cluster.center, exit, neighbor.center, destExit, destination.center];
        const corridor = destination.exits.get(cluster) || new Corridor(type, path, neighbor);

        cluster.exits.set(destination, corridor);
        cluster.neighbors.add(destination);

        neighbor.exits.set(cluster, corridor);
        neighbor.neighbors.add(cluster);

        neighbor.exits.set(destination, corridor);
        neighbor.neighbors.add(destination);

        destination.exits.set(cluster, corridor);
        destination.neighbors.add(cluster);
      }
    }
  }

  // Off-track corridors
  for (const [cluster, neighbors] of exits) {
    if (cluster.isDepot || cluster.isGround) continue;

    const type = getCorridorType(cluster);

    for (const [neighbor, exit] of neighbors) {
      if (!neighbor.isDepot && !neighbor.isGround) continue;
      if (cluster.exits.has(neighbor)) continue;

      const path = [neighbor.center, exit, cluster.center];
      const corridor = neighbor.exits.get(cluster) || new Corridor(type, path, cluster);

      cluster.exits.set(neighbor, corridor);
      cluster.neighbors.add(neighbor);
    }
  }
}

function mapExitCells(clusters) {
  const map = new Map();

  for (const cluster of clusters) {
    for (const cell of cluster.border) {
      if (cluster.isMinerals) {
        // For mineral curtains, any border cell can be an exit
      } else if (!cell.isPath) {
        // For others, only path cell can be an exit
        continue;
      }

      for (const edge of cell.edges) {
        if (cluster.isMinerals) {
          // For mineral curtains, any border cell can be an exit
        } else if (!edge.isPath) {
          // For others, only path cell can be an exit
          continue;
        }

        if (edge.cluster === cluster) continue;
        if (edge.cluster.isAir) continue;

        setExitCell(map, cluster, cell, edge.cluster);
        setExitCell(map, edge.cluster, edge, cluster);
      }
    }
  }

  return map;
}

function setExitCell(map, cluster, cell, neighbor) {
  let exits = map.get(cluster);

  if (!exits) {
    exits = new Map();
    map.set(cluster, exits);
  }

  let cells = exits.get(neighbor);

  if (!cells) {
    cells = new Set();
    exits.set(neighbor, cells);
  }

  cells.add(cell);
}

function centerExitCells(map) {
  const centered = new Map();

  for (const [cluster, neighbors] of map) {
    const exits = new Map();
    centered.set(cluster, exits);

    for (const [neighbor, cells] of neighbors.entries()) {
      exits.set(neighbor, getCenterCell(cells));
    }
  }

  return centered;
}

function getCenterCell(cells) {
  let sumx = 0;
  let sumy = 0;
  let count = 0;

  for (const cell of cells) {
    sumx += cell.x;
    sumy += cell.y;
    count++;
  }

  const x = sumx / count;
  const y = sumy / count;

  let closestCell = null;
  let closestDistance = Infinity;

  for (const cell of cells) {
    const distance = (cell.x - x) * (cell.x - x) + (cell.y - y) * (cell.y - y);

    if (distance < closestDistance) {
      closestCell = cell;
      closestDistance = distance;
    }
  }

  return closestCell;
}

function getCorridorType(cluster) {
  if (cluster.isMinerals) return "minerals";
  if (cluster.isCurtain) return "curtain";
  if (cluster.isDepot) return "ground";
  if (cluster.isGround) return "ground";
  if (cluster.isRamp) return "ramp";
  return "air";
}
