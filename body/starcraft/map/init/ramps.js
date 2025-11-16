
export function validateRamp(cluster, clusters) {
  if (isValidRamp(cluster.cells)) {
    const { x, y } = getRampCenter(cluster.cells);

    return cluster.derive(cluster.cells).setRamp().setCenter(x, y);
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

// A valid ramp connects two ground areas
function isValidRamp(ramp) {
  const levels = new Set();

  for (const cell of ramp) {
    for (const one of cell.rim) {
      if (one.z && !ramp.has(one)) {
        levels.add(one.z);
      }
    }
  }

  return levels.size >= 2;
}

function findAirCluster(clusters) {
  for (const cluster of clusters) {
    if (cluster.isAir) return cluster;
  }
}

function getRampCenter(ramp) {
  let sumx = 0;
  let sumy = 0;
  let count = 0;

  for (const cell of ramp) {
    sumx += cell.x;
    sumy += cell.y;
    count++;
  }

  return {
    x: sumx / count + 0.5,
    y: sumy / count + 0.5,
  };
}
