
// Expand ground clusters to dissolve small patches of ground
export function dissolvePatches(clusters) {
  const ground = new Set();
  const patches = new Set();

  for (const cluster of clusters) {
    if (cluster.isDepot || cluster.isGround) {
      for (const cell of cluster.cells) {
        ground.add(cell);
      }
    } else if (cluster.isPatch) {
      for (const cell of cluster.cells) {
        patches.add(cell);
      }
    }
  }

  let wave = new Set(ground);

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      for (const one of cell.edges) {
        if (ground.has(one)) continue;
        if (!patches.has(one)) continue;

        cell.cluster.add(one);

        next.add(one);
        ground.add(one);
      }
    }

    wave = next;
  }

  for (const cluster of clusters) {
    if (cluster.isPatch || cluster.isEmpty) {
      if (cluster.cells.size) {
        cluster.setGround();
      } else {
        clusters.delete(cluster);
      }
    }
  }
}
