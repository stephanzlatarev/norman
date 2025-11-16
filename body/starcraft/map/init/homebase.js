
export function expandHomebase(cluster, clusters) {
  let wave = new Set(cluster.cells);

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      for (const one of cell.rim) {
        if (!one.isPlot && !one.isResource) continue;
        if (cluster.cells.has(one)) continue;

        cluster.add(one);
        next.add(one);
      }
    }

    wave = next;
  }

  return cluster;
}
