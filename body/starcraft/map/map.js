import Board from "./board.js";

class Map {

  create(gameInfo) {
    this.left = gameInfo.startRaw.playableArea.p0.x;
    this.top = gameInfo.startRaw.playableArea.p0.y;
    this.right = gameInfo.startRaw.playableArea.p1.x;
    this.bottom = gameInfo.startRaw.playableArea.p1.y;

    this.width = this.right - this.left;
    this.height = this.bottom - this.top;

    this.board = new Board(this, gameInfo.startRaw.placementGrid, gameInfo.startRaw.pathingGrid);
  }

  sync(gameInfo) {
    this.board.sync(gameInfo.startRaw.pathingGrid);
  }

  cell(x, y) {
    return this.board.cells[Math.floor(y)][Math.floor(x)];
  }

  zone(x, y) {
    return this.cell(x, y).zone;
  }

  // Check if a unit of the given size can be placed in the given coordinates entirely within this zone
  accepts(x, y, size) {
    x = Math.floor(x);
    y = Math.floor(y);

    const cells = this.board.cells;
    const head = Math.floor(size / 2);
    const tail = Math.floor((size - 1) / 2);
    const minx = x - head;
    const maxx = x + tail;
    const miny = y - head;
    const maxy = y + tail;

    for (let row = miny; row <= maxy; row++) {
      const line = cells[row];

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

        if (!cell.isPlot || !cell.isPath || cell.isObstacle) {
          return false;
        }
      }
    }

    return true;
  }

}

export default new Map();
