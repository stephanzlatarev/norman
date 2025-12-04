/**
- Pathable but non-plot cells make a curtain (Persephone)
- Four or more touching mineral fields make a curtain containing the mineral fields (Torches, Thunderbird)
- One or more touching large obstacles away from resources makes a curtain (Abyssal Reef, Torches)
- Back of mineral line makes a curtain but leaves minerals to depot (Pylon)
**/

export function separateCurtains(cluster) {
  const curtains = findCurtains(cluster.cells);
  if (!curtains.length) return cluster;

  const clusters = [cluster];

  for (const curtain of curtains) {
    clusters.push(cluster.derive(curtain).setCurtain());
  }

  return clusters;
}

function findCurtains(cells) {
  const curtains = [];
  const traversed = new Set();

  for (const cell of cells) {
    if (!isCurtainCell(cell)) continue;
    if (traversed.has(cell)) continue;

    if (isCurtainEnd(cell, cells)) {
      const curtain = findCurtain(cell, cells, traversed);

      if (curtain) {
        curtains.push(curtain);

        for (const cell of curtain) {
          traversed.add(cell);
          cell.isCurtain = true;
        }
      }
    }
  }

  return curtains;
}

function findCurtain(cell, cells, exclude) {
  const curtain = new Set([cell]);
  const links = new Set();

  // Find one end of the curtain - connected curtain end cells
  let wave = new Set([cell]);
  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      const isLinkCurtainEnd = isCurtainEnd(cell, cells);

      for (const one of cell.rim) {
        if (curtain.has(one)) continue;
        if (exclude.has(one)) continue;
        if (!cells.has(one)) continue;

        if (isCurtainEnd(one, cells)) {
          curtain.add(one);
          links.add(cell);
          next.add(one);
        } else if (isLinkCurtainEnd) {
          next.add(one);
        }
      }
    }

    wave = next;
  }

  // List the adjacent cells to the start curtain end that are outside this cluster
  const start = new Set(curtain);
  const coast = new Set();
  for (const cell of start) {
    for (const one of cell.rim) {
      if (!cells.has(one)) {
        coast.add(one);
      }
    }
  }

  // Find the other end of the curtain - a new curtain end cell
  wave = new Set(curtain);
  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      const isLinkCurtainBody = isCurtainCell(cell, cells);

      for (const one of cell.rim) {
        if (curtain.has(one)) continue;
        if (exclude.has(one)) continue;
        if (!cells.has(one)) continue;

        if (isCurtainCell(one, cells)) {
          curtain.add(one);
          links.add(cell);
          next.add(one);
        } else if (isLinkCurtainBody) {
          next.add(one);
        }
      }
    }

    wave = next;
  }

  // Remove cells that are not curtain cells and don't link other curtain cells
  for (const cell of curtain) {
    if (!isCurtainCell(cell) && !links.has(cell)) {
      curtain.delete(cell);
    }
  }

  // Check if we found a closed curtain by seeing if the curtain touches other cells outside this cluster
  let isClosed = false;  
  for (const cell of curtain) {
    if (start.has(cell)) continue;

    for (const one of cell.rim) {
      if (!cells.has(one) && !coast.has(one)) {
        isClosed = true;
        break;
      }
    }
    if (isClosed) break;
  }

  if (isClosed) {
    return curtain;
  } else {
    // Make sure we don't search for a curtain at the same starting curtain end
    for (const cell of start) {
      exclude.add(cell);
    }
  }
}

function isCurtainCell(cell) {
  return !cell.isPlot || cell.isResource;
}

function isCurtainEnd(cell, cells) {
  if (!isCurtainCell(cell)) return false;

  for (const one of cell.rim) {
    if (!one.isPath && !cells.has(one)) return true;
  }
}

export function dissolveInvalidCurtains(clusters) {
  for (const cluster of clusters) {
    if (!cluster.isCurtain) continue;
    if (isValidCurtain(cluster.cells)) continue;

    cluster.setPatch();
  }
}

// Curtain is valid when it separates at least two grounds
function isValidCurtain(curtain) {
  const grounds = new Set();

  for (const cell of curtain) {
    for (const one of cell.rim) {
      if (!one.z) continue;            // This is air
      if (curtain.has(one)) continue;  // This is the curtain

      if (one.cluster.isDepot || one.cluster.isGround || one.cluster.isPatch) {
        grounds.add(one.cluster);
      }

      if (grounds.size >= 2) return true;
    }
  }
}
