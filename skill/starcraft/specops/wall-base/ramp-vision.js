
export default function(site) {
  let wave = new Set();

  const center = site.cell;
  center.rampVisionLevel = 7;

  for (const neighbor of center.edges) {
    neighbor.rampVisionLevel = 7;

    if (neighbor.isPath && !neighbor.isPlot) {
      wave.add(neighbor);
    }
  }

  for (let i = 0; (i < 16) && wave.size; i++) {
    const next = new Set();

    for (const cell of wave) {
      for (const neighbor of cell.edges) {
        if (neighbor.rampVisionLevel !== undefined) continue;

        neighbor.rampVisionLevel = cell.rampVisionLevel - 1;

        if (neighbor.isPath) {
          next.add(neighbor);
        }
      }
    }

    wave = next;
  }
}
