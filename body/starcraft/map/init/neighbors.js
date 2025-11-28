import Corridor from "../corridor.js";

export function initNeighbors(clusters) {
  setExits(clusters);
  setNeighbors(clusters);
}

function setExits(clusters) {
  for (const cluster of clusters) {
    cluster.exits = new Map();

    for (const cell of cluster.border) {
      for (const neighborCell of cell.rim) {
        const neighbor = neighborCell.cluster;

        if (neighbor === cluster) continue;
        if (!neighbor.isDepot && !neighbor.isGround && !neighbor.isCurtain && !neighbor.isRamp) continue;
        if (cluster.exits.has(neighbor)) continue;

        const type = getCorridorType(cluster);
        const destinations = getCorridorDestinations(cluster, neighbor);

        for (const destination of destinations) {
          if (cluster.exits.has(destination)) continue;
          cluster.exits.set(destination, new Corridor(type, neighbor));
        }
      }
    }
  }
}

function getCorridorType(cluster) {
  if (cluster.isCurtain) return "curtain";
  if (cluster.isDepot) return "ground";
  if (cluster.isGround) return "ground";
  if (cluster.isRamp) return "ramp";
  return "air";
}

function getCorridorDestinations(from, via) {
  if (via.isDepot || via.isGround) {
    return [via];
  } else {
    const destinations = [];

    for (const cell of via.border) {
      for (const one of cell.rim) {
        const neighbor = one.cluster;

        if ((neighbor !== from) && (neighbor.isDepot || neighbor.isGround)) {
          destinations.push(neighbor);
        }
      }
    }

    return destinations;
  }
}

function setNeighbors(clusters) {
  for (const cluster of clusters) {
    cluster.neighbors = new Set();

    for (const [neighbor, corridor] of cluster.exits) {
      if (corridor.isGround || corridor.isChoke || corridor.isRamp) {
        cluster.neighbors.add(neighbor);
      }
    }
  }
}
