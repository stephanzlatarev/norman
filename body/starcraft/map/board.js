
class Board {

  create(gameInfo) {
    const playableArea = gameInfo.startRaw.playableArea;
    const placementGrid = gameInfo.startRaw.placementGrid;
    const pathingGrid = gameInfo.startRaw.pathingGrid;
    const terrainHeight = gameInfo.startRaw.terrainHeight;

    this.left = playableArea.p0.x;
    this.top = playableArea.p0.y;
    this.right = playableArea.p1.x;
    this.bottom = playableArea.p1.y;
    this.width = this.right - this.left;
    this.height = this.bottom - this.top;

    this.cells = [];
    this.board = new Set();
    this.ground = new Set();

    const size = placementGrid.size;

    for (let y = 0; y < size.y; y++) {
      const row = [];

      for (let x = 0; x < size.x; x++) {
        const index = x + y * size.x;
        const pos = 7 - index % 8;
        const mask = 1 << pos;
        const gridIndex = Math.floor(index / 8);

        const isOn = (x >= this.left) && (x <= this.right) && (y >= this.top) && (y <= this.bottom);
        const isPlot = isOn && ((placementGrid.data[gridIndex] & mask) != 0);
        const isPath = isOn && ((pathingGrid.data[gridIndex] & mask) != 0);
        const height = (isPath || isPlot) ? Math.max((terrainHeight.data[index] - 127) / 8, 0) : 0;

        const cell = new Cell(x, y, height, isOn, isPath, isPlot);

        if (cell.isOn) this.board.add(cell);
        if (cell.isPath) this.ground.add(cell);

        row.push(cell);
      }

      this.cells.push(row);
    }

    identifyCellRims(this, this.cells);
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

  cell(x, y) {
    const row = this.cells[Math.floor(y)];

    if (row) return row[Math.floor(x)];
  }

  sector(x, y) {
    const cell = this.cell(x, y);

    if (cell) return cell.sector;
  }

  zone(x, y) {
    const cell = this.cell(x, y);

    if (cell) return cell.zone;
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

  constructor(x, y, z, isOn, isPath, isPlot) {
    this.id = y * 1000 + x + 1;
    this.x = x;
    this.y = y;
    this.z = z;
    this.isOn = isOn;
    this.isPath = isPath;
    this.isPlot = isPlot;
    this.isObstacle = false;
    this.isResource = false;

    this.edges = [];
    this.rim = new Set();

    this.zone = null;
  }

  isObstructed() {
    return !this.isPlot || !this.isPath || this.isObstacle || this.isResource;
  }

}

const EDGES = [
  { dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }
];
const CORNERS = [
  { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }
];

function identifyCellRims(board, cells) {
  for (let y = board.top; y <= board.bottom; y++) {
    for (let x = board.left; x <= board.right; x++) {
      const cell = cells[y][x];

      for (const one of EDGES) {
        const neighbor = cells[y + one.dy][x + one.dx];

        if (neighbor.isOn) {
          cell.edges.push(neighbor);
          cell.rim.add(neighbor);
        }
      }

      for (const one of CORNERS) {
        const neighbor = cells[y + one.dy][x + one.dx];

        if (neighbor.isOn) {
          cell.rim.add(neighbor);
        }
      }
    }
  }
}

export default new Board();
