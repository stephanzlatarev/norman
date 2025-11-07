import Units from "../units.js";

const EDGES = [
  { dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }
];
const CORNERS = [
  { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }
];

const ground = new Set();

class Board {

  create(gameInfo) {
    const playableArea = gameInfo.startRaw.playableArea;
    const placementGrid = gameInfo.startRaw.placementGrid;
    const pathingGrid = gameInfo.startRaw.pathingGrid;

    this.left = playableArea.p0.x;
    this.top = playableArea.p0.y;
    this.right = playableArea.p1.x;
    this.bottom = playableArea.p1.y;
    this.width = this.right - this.left;
    this.height = this.bottom - this.top;

    this.cells = [];
    this.ground = ground;

    const size = placementGrid.size;

    for (let y = 0; y < size.y; y++) {
      const row = [];

      for (let x = 0; x < size.x; x++) {
        const index = x + y * size.x;
        const pos = 7 - index % 8;
        const mask = 1 << pos;

        const isOn = (x >= this.left) && (x <= this.right) && (y >= this.top) && (y <= this.bottom);
        const isPlot = isOn && ((placementGrid.data[Math.floor(index / 8)] & mask) != 0);
        const isPath = isOn && ((pathingGrid.data[Math.floor(index / 8)] & mask) != 0);

        const cell = new Cell(x, y, isOn, isPath, isPlot);

        if (cell.isPath) ground.add(cell);

        row.push(cell);
      }

      this.cells.push(row);
    }

    ignoreInitialBuildings(this.cells);
    identifyRims(this, this.cells);
  }

  sync(gameInfo) {
    const grid = gameInfo.startRaw.pathingGrid;
    const size = grid.size;

    for (let y = this.top; y <= this.bottom; y++) {
      for (let x = this.left; x < this.right; x++) {
        const index = x + y * size.x;
        const pos = 7 - index % 8;
        const mask = 1 << pos;

        const cell = this.cells[y][x];
        const isPath = (grid.data[Math.floor(index / 8)] & mask) != 0;

        if (isPath !== cell.isPath) {
          cell.isPath = isPath;

          if (isPath) {
            this.ground.add(cell);
          } else {
            this.ground.delete(cell);
          }
        }
      }
    }
  }

  block(left, top, width, height) {
    for (let row = top; row < top + height; row++) {
      for (let col = left; col < left + width; col++) {
        this.cell(col, row).block();
      }
    }
  }

  cell(x, y) {
    const row = this.cells[Math.floor(y)];

    if (row) return row[Math.floor(x)];
  }

  zone(x, y) {
    return this.cell(x, y).zone;
  }

  // Check if a unit of the given size can be placed in the given coordinates
  accepts(x, y, size) {
    x = Math.floor(x);
    y = Math.floor(y);

    const head = Math.floor(size / 2);
    const tail = Math.floor((size - 1) / 2);
    const minx = x - head;
    const maxx = x + tail;
    const miny = y - head;
    const maxy = y + tail;

    for (let row = miny; row <= maxy; row++) {
      const line = this.cells[row];

      if (!line) {
        console.log("ERROR: Cannot accept a unit in row", row, "around coordinates", x, ":", y);
        return false;
      }

      for (let col = minx; col <= maxx; col++) {
        const cell = line[col];

        if (!cell) {
          console.log("ERROR: Cannot accept a unit in col", col, "of row", row, "around coordinates", x, ":", y);
          return false;
        }

        if (cell.isObstructed()) {
          return false;
        }
      }
    }

    return true;
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
    this.isResource = false;

    this.edges = [];
    this.rim = [];

    this.zone = null;
  }

  block() {
    this.isObstacle = true;
  }

  isObstructed() {
    return !this.isPlot || !this.isPath || this.isObstacle || this.isResource;
  }

}

function ignoreInitialBuildings(cells) {
  for (const building of Units.buildings().values()) {
    const left = Math.round(building.body.x - building.body.r);
    const right = Math.round(building.body.x + building.body.r) - 1;
    const top = Math.round(building.body.y - building.body.r);
    const bottom = Math.round(building.body.y + building.body.r) - 1;

    markCells(cells, left, top, right, bottom, true, true, false, false);
  }

  for (const building of Units.enemies().values()) {
    if (!building.type.isBuilding) continue;

    const left = Math.round(building.body.x - building.body.r);
    const right = Math.round(building.body.x + building.body.r) - 1;
    const top = Math.round(building.body.y - building.body.r);
    const bottom = Math.round(building.body.y + building.body.r) - 1;

    markCells(cells, left, top, right, bottom, true, true, false, false);
  }

  for (const unit of Units.resources().values()) {
    const x = Math.floor(unit.body.x);
    const y = Math.floor(unit.body.y);

    if (unit.type.isMinerals) {
      markCells(cells, x - 1, y, x, y, false, false, true, true);
    } else if (unit.type.isVespene) {
      markCells(cells, x - 1, y - 1, x + 1, y + 1, false, false, true, true);
    }
  }

  for (const obstacle of Units.obstacles().values()) {
    const left = Math.round(obstacle.body.x - obstacle.body.r);
    const right = Math.round(obstacle.body.x + obstacle.body.r) - 1;
    const top = Math.round(obstacle.body.y - obstacle.body.r);
    const bottom = Math.round(obstacle.body.y + obstacle.body.r) - 1;

    markCells(cells, left, top, right, bottom, false, false, true, false);
  }
}

function markCells(cells, left, top, right, bottom, isPath, isPlot, isObstacle, isResource) {
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const cell = cells[y][x];

      if (cell.isOn) {
        cell.isPath = isPath;
        cell.isPlot = isPlot;
        cell.isObstacle = isObstacle;
        cell.isResource = isResource;

        ground.add(cell);
      }
    }
  }
}

function identifyRims(board, cells) {
  for (let y = board.top; y <= board.bottom; y++) {
    for (let x = board.left; x < board.right; x++) {
      const cell = cells[y][x];

      for (const one of EDGES) {
        const neighbor = cells[y + one.dy][x + one.dx];

        if (neighbor.isOn) {
          cell.edges.push(neighbor);
          cell.rim.push(neighbor);
        }
      }

      for (const one of CORNERS) {
        const neighbor = cells[y + one.dy][x + one.dx];

        if (neighbor.isOn) {
          cell.rim.push(neighbor);
        }
      }
    }
  }
}

export default new Board();
