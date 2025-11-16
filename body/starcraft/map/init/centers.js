import Board from "../board.js";

export function setCenter(cluster) {
  let center;

  if (cluster.x && cluster.y) {
    center = Board.cell(cluster.x, cluster.y);
  } else {
    let sumx = 0;
    let sumy = 0;
    let count = 0;

    for (const cell of cluster.cells) {
      sumx += cell.x;
      sumy += cell.y;
      count++;
    }

    const x = sumx / count;
    const y = sumy / count;
    let center = Board.cell(x, y);

    if (cluster.cells.has(center)) {
      cluster.setCenter(x, y);
    } else {
      center = findClosestCell(cluster.cells, center);
      cluster.setCenter(center.x + 0.5, center.y + 0.5);
    }
  }

  cluster.center = center;

  return cluster;
}

function findClosestCell(cells, target) {
  const traversed = new Set([target]);
  let wave = new Set([target]);

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      for (const one of cell.edges) {
        if (traversed.has(one)) continue;
        if (cells.has(one)) return one;

        traversed.add(one);
        next.add(one);
      }
    }

    wave = next;
  }
}
