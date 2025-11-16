
export function separateTerrainHeights(cluster) {
  const clusters = [];
  const grounds = new Map();
  const ramps = new Map();
  const air = new Set();

  for (const cell of cluster.cells) {
    const height = smoothen(cell);

    if (isGround(height)) {
      getGround(grounds, height).add(cell);
    } else if (isRamp(height)) {
      getRamp(ramps, height).add(cell);
    } else {
      air.add(cell);
    }
  }

  for (const ground of grounds.values()) {
    clusters.push(cluster.derive(ground).setGround());
  }

  for (const ramp of ramps.values()) {
    clusters.push(expandRamp(cluster.derive(ramp).setRamp()));
  }

  clusters.push(cluster.derive(air).setAir());

  return clusters;
}

function smoothen(cell) {
  if (!cell.z && !cell.isPlot && !cell.isPath && !cell.isResource) return 0;

  let minz = Infinity;
  let maxz = -Infinity;

  for (const one of cell.edges) {
    if (!one.z) continue;
    if (one.z < minz) minz = one.z;
    if (one.z > maxz) maxz = one.z;
  }

  // Snap the lower and higher level to the even heights outside minz and maxz
  let lower = Math.floor(minz);
  let higher = Math.ceil(maxz);

  // Allow for ramp cells to reach an additional height level
  const gap = (lower === higher) ? 1 : 0;
  lower -= gap;
  higher += gap;

  // Smoothen the height of the cell
  if (cell.z < lower) {
    cell.z = (minz > lower) ? minz : lower;
  } else if (cell.z > higher) {
    cell.z = (maxz < higher) ? maxz : higher;
  }

  return cell.z;
}

function isGround(height) {
  return (height > 0) && !(height % 2);
}

function getGround(grounds, height) {
  let ground = grounds.get(height);

  if (!ground) {
    ground = new Set();
    grounds.set(height, ground);
  }

  return ground;
}

function isRamp(height) {
  return (height > 0);
}

function getRamp(ramps, height) {
  height -= height % 2;

  let ramp = ramps.get(height);

  if (!ramp) {
    ramp = new Set();
    ramps.set(height, ramp);
  }

  return ramp;
}

// Ramps include non-plot path cells adjacent to ramp cells
function expandRamp(cluster) {
  let wave = new Set(cluster.cells);

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      for (const one of cell.rim) {
        if (one.isPlot) continue;
        if (!one.isPath) continue;
        if (cluster.cells.has(one)) continue;

        cluster.add(one);
        next.add(one);
      }
    }

    wave = next;
  }

  return cluster;
}
