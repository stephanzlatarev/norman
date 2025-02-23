import Units from "../units.js";

const EDGES = [
  { dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }
];
const CORNERS = [
  { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }
];

const ground = new Set();

export default class Board {

  constructor(box, placementGrid, pathingGrid) {
    this.box = box;
    this.cells = [];
    this.ground = ground;

    const size = placementGrid.size;

    for (let y = 0; y < size.y; y++) {
      const row = [];

      for (let x = 0; x < size.x; x++) {
        const index = x + y * size.x;
        const pos = 7 - index % 8;
        const mask = 1 << pos;

        const isOn = (x >= box.left) && (x <= box.right) && (y >= box.top) && (y <= box.bottom);
        const isPlot = isOn && ((placementGrid.data[Math.floor(index / 8)] & mask) != 0);
        const isPath = isOn && ((pathingGrid.data[Math.floor(index / 8)] & mask) != 0);

        const cell = new Cell(x, y, isOn, isPath, isPlot);

        if (cell.isPath) ground.add(cell);

        row.push(cell);
      }

      this.cells.push(row);
    }

    ignoreInitialBuildings(this.cells);
    identifyNeighbors(this.box, this.cells);
  }

  sync(grid) {
    const size = grid.size;

    for (let y = this.box.top; y <= this.box.bottom; y++) {
      for (let x = this.box.left; x < this.box.right; x++) {
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
        this.cells[row][col].block();
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

    this.edges = [];
    this.neighbors = [];

    this.zone = null;
  }

  block() {
    this.isObstacle = true;
  }

}

function ignoreInitialBuildings(cells) {
  for (const building of Units.buildings().values()) {
    const left = Math.ceil(building.body.x - building.body.r);
    const right = Math.floor(building.body.x + building.body.r);
    const top = Math.ceil(building.body.y - building.body.r) - 1;
    const bottom = Math.floor(building.body.y + building.body.r) - 1;

    clearCell(cells, left, top, right, bottom);
  }

  for (const building of Units.enemies().values()) {
    if (!building.type.isBuilding) continue;

    const left = Math.ceil(building.body.x - building.body.r);
    const right = Math.floor(building.body.x + building.body.r);
    const top = Math.ceil(building.body.y - building.body.r) - 1;
    const bottom = Math.floor(building.body.y + building.body.r) - 1;

    clearCell(cells, left, top, right, bottom);
  }
  
  for (const unit of Units.resources().values()) {
    const x = Math.floor(unit.body.x);
    const y = Math.floor(unit.body.y);

    if (unit.type.isMinerals) {
      clearCell(cells, x - 1, y, x, y);
    } else if (unit.type.isVespene) {
      clearCell(cells, x - 1, y - 1, x + 1, y + 1);
    }
  }
}

function clearCell(cells, left, top, right, bottom) {
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const cell = cells[y][x];

      if (cell.isOn) {
        cell.isPath = true;
        cell.isPlot = true;

        ground.add(cell);
      }
    }
  }
}

function identifyNeighbors(box, cells) {
  for (let y = box.top; y <= box.bottom; y++) {
    for (let x = box.left; x < box.right; x++) {
      const cell = cells[y][x];

      for (const one of EDGES) {
        const neighbor = cells[y + one.dy][x + one.dx];

        if (neighbor.isOn) {
          cell.edges.push(neighbor);
          cell.neighbors.push(neighbor);
        }
      }

      for (const one of CORNERS) {
        const neighbor = cells[y + one.dy][x + one.dx];

        if (neighbor.isOn) {
          cell.neighbors.push(neighbor);
        }
      }
    }
  }
}
