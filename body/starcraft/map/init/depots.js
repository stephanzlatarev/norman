import Board from "../board.js";

/**
- Standard mineral lines make a depot zone
- Two vespene geysers with mineral fields between them make twin depots (Torches D4/5, I4/5)
- Mineral curtains next to ground clusters make a depot zone (Automaton E3, Torches F3)
**/

// The maximum allowed gap between adjacent resources in a depot.
// Must be at least 6 to cover the distance to the center of the depot building.
const GAP = 6;

// The radius of the depot zone around the depot building.
const ZONE_RADIUS = 11.5;
const ZONE_RADIUS_LOW = ZONE_RADIUS / Math.sqrt(2);
const ZONE_RADIUS_SQUARED = ZONE_RADIUS * ZONE_RADIUS;

export function separateCurtainDepots(cluster) {
  // Check if curtain contains resources
  let resource;
  for (const cell of cluster.cells) {
    if (cell.isResource) {
      resource = cell;
      break;
    }
  }
  if (!resource) return cluster;

  // Get all ground cells around the curtain
  const ground = new Set(cluster.cells);
  const surround = new Set();
  let hasVespene = false;

  for (const cell of cluster.cells) {
    for (const one of cell.edges) {
      if (one.cluster.isGround) {
        surround.add(one.cluster);
      }
    }
  }
  for (const one of surround) {
    for (const cell of one.cells) {
      ground.add(cell);
      if (cell.isVespene) hasVespene = true;
    }
  }
  if (!hasVespene) {
    for (const cell of cluster.cells) {
      if (cell.isVespene) {
        hasVespene = true;
        break;
      }
    }
  }
  if (!hasVespene) return cluster;

  const depots = [];
  const { bounds, resources } = findBounds(resource, ground);

  for (const one of bounds) {
    const twin = bounds.find(b => (b !== one));
    const oneresources = twin ? filterResources(one, resources) : resources;
    const { x, y } = findPosition(one, oneresources);

    // Limit the space for the depot by the curtain
    const space = getGroundSpace(x, y, ground, cluster.cells);
    const curtain = getSpaceCurtain(cluster.cells, space);

    for (const cell of cluster.cells) {
      cell.isCurtain = false;
      space.add(cell);
    }
    for (const cell of curtain) {
      cell.isCurtain = true;
    }

    if (isValidDepotPosition(x, y, space)) {
      const blocked = twin ? getBlockBounds(one, twin) : null;
      const depot = expandDepot(x, y, space, blocked);

      depots.push(cluster.derive(depot).setDepot().setCenter(x, y));
      depots.push(cluster.derive(curtain).setCurtain());
    }
  }

  return depots.length ? depots : cluster;
}

function getGroundSpace(x, y, ground, curtain) {
  const center = Board.cell(x, y);
  const space = new Set([center]);
  let wave = new Set([center]);

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      for (const one of cell.edges) {
        if (!one.isPlot) continue;
        if (Math.abs(one.x - x) > ZONE_RADIUS) continue;
        if (Math.abs(one.y - y) > ZONE_RADIUS) continue;
        if (curtain.has(one)) continue;
        if (space.has(one)) continue;
        if (!ground.has(one)) continue;

        space.add(one);
        next.add(one);
      }
    }

    wave = next;
  }

  return space;
}

function getSpaceCurtain(curtain, space) {
  const spaceCurtain = new Set();

  for (const cell of curtain) {
    for (const one of cell.rim) {
      if (!curtain.has(one) && !space.has(one)) {
        spaceCurtain.add(one);
      }
    }
  }

  return spaceCurtain;
}

export function separateGroundDepots(cluster) {
  const depots = [cluster];
  const traversed = new Set();

  for (const cell of cluster.cells) {
    if (cell.isResource && !traversed.has(cell)) {
      const { bounds, resources } = findBounds(cell, cluster.cells);
      let hasMinerals = false;

      for (const cell of resources) {
        traversed.add(cell);
        if (cell.isMinerals) hasMinerals = true;
      }

      // There must be minerals to make a depot
      if (!hasMinerals) continue;

      for (const one of bounds) {
        const twin = bounds.find(b => (b !== one));
        const oneresources = twin ? filterResources(one, resources) : resources;
        const { x, y } = findPosition(one, oneresources);

        if (isValidDepotPosition(x, y, cluster.cells)) {
          const blocked = twin ? getBlockBounds(one, twin) : null;
          const depot = expandDepot(x, y, cluster.cells, blocked);

          depots.push(cluster.derive(depot).setDepot().setCenter(x, y));

          for (const cell of depot) {
            traversed.add(cell);
          }
        }
      }
    }
  }

  return depots;
}

function filterResources(bounds, resources) {
  const filtered = new Set();

  for (const resource of resources) {
    if ((resource.x >= bounds.minx) && (resource.x <= bounds.maxx) &&
        (resource.y >= bounds.miny) && (resource.y <= bounds.maxy)) {
      filtered.add(resource);
    }
  }

  return filtered;
}

function getBlockBounds(one, twin) {
  const bounds = { minx: -Infinity, maxx: +Infinity, miny: -Infinity, maxy: +Infinity };

  if (one.maxx < twin.minx) bounds.minx = twin.minx;
  if (one.minx > twin.maxx) bounds.maxx = twin.maxx;
  if (one.maxy < twin.miny) bounds.miny = twin.miny;
  if (one.miny > twin.maxy) bounds.maxy = twin.maxy;

  return bounds;
}

function findBounds(cell, cells) {
  const traversed = new Set([cell]);

  const bounds = [];
  const resources = new Set();

  const mineralsx = [];
  const mineralsy = [];
  let minerals = 0;
  const vespenex = [];
  const vespeney = [];

  let wave = new Set([cell]);
  let minx = cell.x - GAP;
  let maxx = cell.x + GAP;
  let miny = cell.y - GAP;
  let maxy = cell.y + GAP;

  const addResource = (one) => {
    resources.add(one);

    minx = Math.min(minx, one.x - GAP);
    maxx = Math.max(maxx, one.x + GAP);
    miny = Math.min(miny, one.y - GAP);
    maxy = Math.max(maxy, one.y + GAP);

    if (one.isMinerals) {
      mineralsx[one.x] = (mineralsx[one.x] + 1) || 1;
      mineralsy[one.y] = (mineralsy[one.y] + 1) || 1;
      minerals++;
    } else if (one.isVespene) {
      vespenex[one.x] = (vespenex[one.x] + 1) || 1;
      vespeney[one.y] = (vespeney[one.y] + 1) || 1;
    }
  };

  addResource(cell);

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      for (const one of cell.rim) {
        if ((one.x < minx) || (one.x > maxx) || (one.y < miny) || (one.y > maxy)) continue;
        if (traversed.has(one)) continue;
        if (!cells.has(one)) continue;

        traversed.add(one);
        next.add(one);

        if (one.isResource) addResource(one);
      }
    }

    wave = next;
  }

  if (minerals && !bounds.length && areAllMineralsBetweenVespene(mineralsx, vespenex, minx, maxx)) {
    // Horizontal split
    const splitx = findSplit(mineralsx, minerals, minx, maxx);
    const count = countMinerals(mineralsx, splitx - 1, splitx + 1);

    if (count === minerals) {
      bounds.push({ minx, maxx: splitx, miny, maxy });
      bounds.push({ minx: splitx + 1, maxx, miny, maxy });
    }
  }

  if (minerals && !bounds.length && areAllMineralsBetweenVespene(mineralsy, vespeney, miny, maxy)) {
    // Vertical split
    const splity = findSplit(mineralsy, minerals, miny, maxy);
    const count = countMinerals(mineralsy, splity - 1, splity + 1);

    if (count === minerals) {
      bounds.push({ minx, maxx, miny, maxy: splity });
      bounds.push({ minx, maxx, miny: splity + 1, maxy });
    }
  }

  if (!bounds.length) {
    // No split
    bounds.push({ minx, maxx, miny, maxy });
  }

  return { resources, bounds };
}

function areAllMineralsBetweenVespene(minerals, vespene, min, max) {
  for (let i = min; i <= max; i++) {
    if (vespene[i]) break;            // Most left resource is vespene. Left side is good.
    if (minerals[i]) return false;    // Most left resource is mineral. It is not between vespene.
  }

  for (let i = max; i >= min; i--) {
    if (vespene[i]) break;           // Most right resource is vespene. Right side is good.
    if (minerals[i]) return false;   // Most right resource is mineral. It is not between vespene.
  }

  return true;
}

function findSplit(minerals, total, min, max) {
  const half = total / 2;
  let count = 0;

  for (let i = min; i <= max; i++) {
    count += minerals[i] || 0;

    if (count >= half) return i;
  }
}

function countMinerals(minerals, min, max) {
  let count = 0;

  for (let i = min; i <= max; i++) {
    count += minerals[i] || 0;
  }

  return count;
}

function findPosition(bounds, resources) {
  let bestScore = Infinity;
  let bestX;
  let bestY;

  // TODO: Adjust minx, maxx, miny, maxy to reduce search area
  for (let x = bounds.minx; x <= bounds.maxx; x++) {
    for (let y = bounds.miny; y <= bounds.maxy; y++) {
      const score = calculateScore(x, y, resources);

      if (score < bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }

  return { x: bestX + 0.5, y: bestY + 0.5 };
}

function isValidDepotPosition(x, y, cells) {
  // Check that the cells for the depot building are available
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      if (!cells.has(Board.cell(x + dx, y + dy))) return false;
    }
  }

  return true;
}

function expandDepot(x, y, cells, nobounds) {
  const depot = new Set();

  for (let dx = 0; dx <= ZONE_RADIUS; dx++) {
    for (let dy = 0; dy <= ZONE_RADIUS; dy++) {
      if ((dx > ZONE_RADIUS_LOW) && (dy > ZONE_RADIUS_LOW)) continue;
      if (((dx > ZONE_RADIUS_LOW) || (dy > ZONE_RADIUS_LOW)) && (dx * dx + dy * dy > ZONE_RADIUS_SQUARED)) continue;

      addCellToDepot(x, y, +dx, +dy, depot, cells, nobounds);
      addCellToDepot(x, y, -dx, +dy, depot, cells, nobounds);
      addCellToDepot(x, y, +dx, -dy, depot, cells, nobounds);
      addCellToDepot(x, y, -dx, -dy, depot, cells, nobounds);
    }
  }

  return depot;
}

function addCellToDepot(x, y, dx, dy, depot, cells, nobounds) {
  const xx = x + dx;
  const yy = y + dy;

  if (nobounds && (xx >= nobounds.minx) && (xx <= nobounds.maxx) && (yy >= nobounds.miny) && (yy <= nobounds.maxy)) return;

  const cell = Board.cell(xx, yy);

  if (cells.has(cell)) {
    depot.add(cell);
  }
}

function calculateScore(x, y, resources) {
  let score = 0;

  for (const resource of resources) {
    let dx = Math.abs(resource.x - x);
    let dy = Math.abs(resource.y - y);

    if ((dx <= 5) && (dy <= 5)) {
      if ((dx === 5) && (dy === 5)) {
        // When at the edge, we're at the best score
      } else {
        // When inside, we're too close
        return Infinity;
      }
    } else if (dx <= 4) {
      score += dy - 6;
    } else if (dy <= 4) {
      score += dx - 6;
    } else {
      score += dx + dy - 10;
    }
  }

  return score;
}
