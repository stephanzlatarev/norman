
export function setBorder(cluster) {
  cluster.border = findBorder(cluster.cells);

  return cluster;
}

export function findBorder(cells) {
  const border = new Set();

  for (const cell of cells) {
    if (isBorderCell(cell, cells)) {
      border.add(cell);
    }
  }

  return border;
}

function isBorderCell(cell, space) {
  if (cell.rim.edges < 4) return true;

  for (const one of cell.edges) {
    if (!space.has(one)) return true;
  }
}
