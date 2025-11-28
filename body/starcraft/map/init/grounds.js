
export function validateGround(cluster, clusters) {
  if (isValidGround(cluster.cells)) {
    return cluster;
  } else {
    const air = findAirCluster(clusters);

    if (air) {
      for (const cell of cluster.cells) {
        air.add(cell);
      }
    }

    return air;
  }
}

// A valid ground has enough space to build things
function isValidGround(ground) {
  return ground.size >= 20;
}

function findAirCluster(clusters) {
  for (const cluster of clusters) {
    if (cluster.isAir) return cluster;
  }
}

// Ground clusters get a skirt of air cells around them to allow ground units to move without leaving ground zones
export function addSkirt(cluster) {
  if (cluster.isAir) return;

  for (const cell of cluster.border) {
    for (const neighbor of cell.rim) {
      if (neighbor.cluster.isAir) {
        cluster.add(neighbor);
      }
    }
  }
}
