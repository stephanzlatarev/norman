
const MIN_AREA_MARGIN = 3;
const AREA_RADIUS = 10;

let ids = 1;

export default class Board {

  constructor(box, placementGrid, pathingGrid) {
    this.box = box;
    this.cells = [];
    this.areas = new Set();
    this.joins = new Set();

    const size = placementGrid.size;

    for (let y = 0; y < size.y; y++) {
      const row = [];

      for (let x = 0; x < size.x; x++) {
        const index = x + y * size.x;
        const pos = 7 - index % 8;
        const mask = 1 << pos;

        const isOn = (x >= box.left) && (x <= box.right) && (y >= box.top) && (y <= box.bottom);
        const isPlot = (placementGrid.data[Math.floor(index / 8)] & mask) != 0;
        const isPath = (pathingGrid.data[Math.floor(index / 8)] & mask) != 0;

        row.push(new Cell(x, y, isOn, isPath, isPlot));
      }

      this.cells.push(row);
    }

    const SIDES = [{ dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }];
    for (let y = box.top; y <= box.bottom; y++) {
      for (let x = box.left; x < box.right; x++) {
        const cell = this.cells[y][x];

        for (const side of SIDES) {
          const neighbor = this.cells[y + side.dy][x + side.dx];

          if (neighbor.isOn) {
            cell.neighbors.push(neighbor);
          }
        }
      }
    }
  }

  sync(grid) {
    const size = grid.size;

    for (let y = this.box.top; y <= this.box.bottom; y++) {
      for (let x = this.box.left; x < this.box.right; x++) {
        const index = x + y * size.x;
        const pos = 7 - index % 8;
        const mask = 1 << pos;

        const isPath = (grid.data[Math.floor(index / 8)] & mask) != 0;

        if (isPath !== this.cells[y][x].isPath) {
          this.cells[y][x].isPath = isPath;
        }
      }
    }
  }

  path() {
    const peaks = findMarginPeaks(this);
    clumpMarginPeaks(this, peaks);
    spreadAreas(this);
    locateJoins(this);
  }

  mark(left, top, width, height, mark) {
    for (let row = top; row < top + height; row++) {
      for (let col = left; col < left + width; col++) {
        mark(this.cells[row][col]);
      }
    }
  }

  block(left, top, width, height) {
    for (let row = top; row < top + height; row++) {
      for (let col = left; col < left + width; col++) {
        const cell = this.cells[row][col];

        cell.isPath = true;
        cell.isPlot = true;
        cell.isObstacle = true;
      }
    }
  }

  clear(left, top, width, height) {
    for (let row = top; row < top + height; row++) {
      for (let col = left; col < left + width; col++) {
        const cell = this.cells[row][col];

        cell.isPath = true;
        cell.isPlot = true;
      }
    }
  }

}

class Cell {

  constructor(x, y, isOn, isPath, isPlot) {
    this.id = y * 1000 + x + 1;
    this.x = x;
    this.y = y;
    this.isOn = isOn;
    this.isPath = isPath;
    this.isPlot = isPlot;
    this.isObstacle = false;

    this.neighbors = [];
    this.margin = 0;
    this.area = null;
    this.join = null;

    this.zone = null;
  }

  clear() {
    this.isPath = true;
    this.isPlot = true;
  }

}

class Clump {

  static SQUARE_RADIUS = AREA_RADIUS * AREA_RADIUS;

  constructor(cell) {
    this.margin = cell.margin;
    this.x = cell.x;
    this.y = cell.y;

    this.top = new Set();
    this.top.add(cell);
  }

  canAddCell(cell) {
    if (squareDistance(this, cell) > Clump.SQUARE_RADIUS) return false;

    for (const one of this.top) {
      const margin = this.margin + cell.margin;

      if ((Math.abs(cell.x - one.x) <= margin) && (Math.abs(cell.y - one.y) <= margin)) {
        return true;
      }
    }

    return false;
  }

  addCell(cell) {
    if (cell.margin === this.margin) {
      this.top.add(cell);
      this.recalculateCenter();
    }
  }

  canAddClump(clump) {
    if (clump.margin > this.margin) return false;

    const dx = this.x - clump.x;
    const dy = this.y - clump.y;
    const sq = dx * dx + dy * dy;

    if (sq > Clump.SQUARE_RADIUS) return false;

    const margin = this.margin + clump.margin;

    return (Math.abs(this.x - clump.x) <= margin) && (Math.abs(this.y - clump.y) <= margin);
  }

  addClump(clump) {
    if (clump.margin === this.margin) {
      for (const cell of clump.top) {
        this.top.add(cell);
      }
    }

    this.recalculateCenter();
  }

  recalculateCenter() {
    let sumx = 0;
    let sumy = 0;

    for (const one of this.top) {
      sumx += one.x;
      sumy += one.y;
    }

    this.x = sumx / this.top.size;
    this.y = sumy / this.top.size;
  }

}

class Area {

  constructor(board, clump) {
    this.id = ids++;
    this.x = clump.x;
    this.y = clump.y;
    this.level = clump.margin;

    this.cells = new Set();
    this.joins = new Set();

    board.areas.add(this);
  }

}

class Join {

  constructor(board, cell, areas) {
    this.id = ids++;
    this.x = cell.x;
    this.y = cell.y;
    this.level = cell.margin;

    this.cells = new Set();
    this.areas = new Set(areas);

    board.joins.add(this);
  }

  addCell(cell) {
    if (cell.margin === this.level) {
      this.cells.add(cell);
    }
  }
}

function findMarginPeaks(board) {
  const peaks = new Set();

  let batch = new Set();
  let margin = 1;

  // Get all pathable cells that border with non-pathable cells to be the first layer
  for (let row = board.box.top + 1; row < board.box.bottom; row++) {
    for (let col = board.box.left + 1; col < board.box.right; col++) {
      const cell = board.cells[row][col];

      if (cell.isPath) {
        for (const neighbor of cell.neighbors) {
          if (!neighbor.isPath) {
            cell.margin = 1;
            batch.add(cell);
            break;
          }
        }
      }
    }
  }

  // Get layer by layer of cells that border the previous layer
  while (batch.size) {
    const nextBatch = new Set();
    const nextMargin = margin + 1;

    for (const cell of batch) {
      let hasNextMarginNeighbor = false;

      for (const neighbor of cell.neighbors) {
        if (!neighbor.isPath) continue;

        if (neighbor.margin === nextMargin) {
          hasNextMarginNeighbor = true;
        } else if (!neighbor.margin) {
          nextBatch.add(neighbor);
          neighbor.margin = nextMargin;
          hasNextMarginNeighbor = true;
        }
      }

      if (cell.isPlot && !hasNextMarginNeighbor && (cell.margin >= MIN_AREA_MARGIN)) {
        peaks.add(cell);
      }
    }

    batch = nextBatch;
    margin = nextMargin;
  }

  return peaks;
}

function clumpMarginPeaks(board, peaks) {
  let clumps = [];

  // Clump nearby peaks
  for (const peak of [...peaks].sort((a, b) => (b.margin - a.margin))) {
    let isClumped = false;

    for (const clump of clumps) {
      if (clump.canAddCell(peak)) {
        clump.addCell(peak);
        isClumped = true;
        break;
      }
    }

    if (!isClumped) {
      clumps.push(new Clump(peak))
    }
  }

  // Clump nearby clumps
  for (let i = 0; i < clumps.length; i++) {
    const clump = clumps[i];
    if (!clump) continue;

    for (let j = i + 1; j < clumps.length; j++) {
      const another = clumps[j];

      if (another && clump.canAddClump(another)) {
        clump.addClump(another);
        clumps[j] = null;
      }
    }
  }
  clumps = clumps.filter(clump => !!clump);

  // Create areas based on the clumps
  for (const clump of clumps) {
    new Area(board, clump);
  }
}

function spreadAreas(board) {
  if (!board.areas.size) return;

  const areas = [...board.areas].sort((a, b) => (b.level - a.level));
  const claims = new Map();
  const joins = new Map();

  let wave = new Set();
  let level = 1;
  let areaStart = areas[0].level;
  let areaLevel = areaStart;
  let areaIndex = 0;

  while (!areaIndex || wave.size) {
    const nextWave = new Set();

    // Add more areas
    while ((areaIndex < areas.length) && (areas[areaIndex].level >= areaLevel)) {
      const area = areas[areaIndex];
      const cell = board.cells[Math.round(area.y)][Math.round(area.x)];
      const claim = new Set();

      wave.add(cell);
      claim.add(area);
      claims.set(cell, claim);

      areaIndex++;
    }
    areaLevel--;

    // Spread areas with wave
    for (const cell of wave) {
      const claim = claims.get(cell);
      const area = claim.values().next().value;

      if (claim.size === 1) {
        cell.area = area;
        area.cells.add(cell);
      } else if (claim.size === 2) {
        const key = [...claim].map(area => area.id).sort((a, b) => (a - b)).join("-");
        let join = joins.get(key);

        if (!join) {
          join = new Join(board, cell, claim);
          joins.set(key, join);
        }

        cell.area = area;
        area.cells.add(cell);
        join.addCell(cell);
        continue;
      } else {
        cell.area = area;
        area.cells.add(cell);
        continue;
      }

      for (const neighbor of cell.neighbors) {
        if (!neighbor.isPath) continue;
        if (neighbor.area) continue;

        const squareLevel = (level + area.level - areaStart) * (level + area.level - areaStart);
        if (squareDistance(neighbor, area) > squareLevel) continue;

        nextWave.add(neighbor);

        const claimNeighbor = claims.get(neighbor);
        if (claimNeighbor) {
          claimNeighbor.add(area);
        } else {
          const claim = new Set();
          claim.add(area);
          claims.set(neighbor, claim);
        }
      }
    }

    wave = nextWave;
    level++;
  }
}

function locateJoins(board) {
  for (const join of board.joins) {
    if (join.cells.size > 1) {
      let sumx = 0;
      let sumy = 0;

      for (const cell of join.cells) {
        sumx += cell.x;
        sumy += cell.y;
      }

      join.x = sumx / join.cells.size;
      join.y = sumy / join.cells.size;
    }

    join.cells.clear();
  }
}

function squareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
