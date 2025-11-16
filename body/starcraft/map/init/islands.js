
// Splits the given set of cells into sets of connected cells
export function separateIslands(cluster) {
  if (cluster.isCurtain) return cluster;

  const islands = [];
  const traversed = new Set();

  for (const cell of cluster.cells) {
    if (!traversed.has(cell)) {
      const island = cluster.derive(createIsland(cell, cluster.cells));

      islands.push(island);

      for (const cell of island.cells) traversed.add(cell);
    }
  }

  return islands;
}

function createIsland(cell, cells) {
  const island = new Set([cell]);
  let wave = new Set([cell]);

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      for (const one of cell.edges) {
        if (!island.has(one) && cells.has(one)) {
          island.add(one);
          next.add(one);
        }
      }
    }

    wave = next;
  }

  return island;
}
