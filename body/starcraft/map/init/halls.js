import { findBorder } from "./borders.js";

const HALL_RADIUS_MIN = 6;
const HALL_CELLS_MIN = 2 * HALL_RADIUS_MIN * HALL_RADIUS_MIN + 4 * HALL_RADIUS_MIN + 1;

export function separateHalls(cluster, clusters) {
  const halls = separateNormalHalls(cluster);

  if (halls.length === 1) {
    separateCurtainedHall(cluster, clusters);
  }

  return halls;
}

function separateCurtainedHall(cluster, clusters) {
  for (const cell of cluster.cells) {
    for (const one of cell.edges) {
      if (!one.isPlot) continue;
      if (cluster.cells.has(one)) continue;

      for (const other of clusters) {
        if (other.isDepot && other.cells.has(one)) {
          // This is not a curtained hall
          return;
        }
      }
    }
  }

  // This is a curtained hall. Set it as ground.
  const { x, y } = getHallCenter(cluster.cells);
  cluster.setGround().setCenter(x, y);
}

function separateNormalHalls(cluster) {
  const halls = [cluster];

  while (cluster.cells.size >= HALL_CELLS_MIN) {
    const margins = getMargins(cluster.cells);
    if (margins.length < HALL_RADIUS_MIN) break;

    const level = margins.length - 1;
    const top = margins[level];
    const [center] = top;
    const area = getLevelArea(center, top, cluster.cells);
    const { x, y } = getHallCenter(area);
    const hall = expandHall(area, cluster.cells, level - 1);

    halls.push(cluster.derive(hall).setGround().setCenter(x, y));
  }

  cluster.setPatch();

  return halls;
}

function getMargins(cells) {
  const space = new Set(cells);
  const margins = [];

  // The first wave consist of all cells in the space that border with cells outside the space
  let wave = new Set(findBorder(space));

  // Get wave by wave of cells that border the previous wave
  while (wave.size) {
    margins.push(wave);

    for (const cell of wave) {
      space.delete(cell);
    }

    const next = new Set();

    for (const cell of wave) {
      for (const one of cell.edges) {
        if (space.has(one)) {
          next.add(one);
        }
      }
    }

    wave = next;
  }

  return margins;
}

function getLevelArea(cell, level, cells) {
  const area = new Set();

  let wave = new Set([cell]);

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      for (const one of cell.rim) {
        if (area.has(one)) continue;
        if (!cells.has(one)) continue;

        area.add(one);

        if (level.has(one)) next.add(one);
      }
    }

    wave = next;
  }

  return area;
}

function getHallCenter(hall) {
  let sumx = 0;
  let sumy = 0;
  let count = 0;

  for (const cell of hall) {
    sumx += cell.x;
    sumy += cell.y;
    count++;
  }

  return {
    x: sumx / count + 0.5,
    y: sumy / count + 0.5,
  };
}

function expandHall(area, cells, radius) {
  const hall = new Set(area);

  let wave = new Set(area);
  let steps = radius;

  while (wave.size && (steps-- > 0)) {
    const next = new Set();

    for (const cell of wave) {
      for (const one of cell.edges) {
        if (hall.has(one)) continue;
        if (!cells.has(one)) continue;

        hall.add(one);
        next.add(one);
      }
    }

    wave = next;
  }

  return hall;
}
