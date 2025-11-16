
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
