import Board from "./board.js";
import Units from "../units.js";
import Zone from "./zone.js";

class Map {

  create(gameInfo) {
    this.left = gameInfo.startRaw.playableArea.p0.x;
    this.top = gameInfo.startRaw.playableArea.p0.y;
    this.right = gameInfo.startRaw.playableArea.p1.x;
    this.bottom = gameInfo.startRaw.playableArea.p1.y;

    this.width = this.right - this.left;
    this.height = this.bottom - this.top;

    this.board = new Board(this, gameInfo.startRaw.placementGrid, gameInfo.startRaw.pathingGrid);

    clearInitialPathing(this.board);

    this.board.path();
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
  accepts(zone, x, y, size) {
    zone = (zone instanceof Zone) ? zone : this.zone(x, y);
    if (!zone) {
      console.log("ERROR: Cannot accept a unit outside map zones at coordinates", x, ":", y);
      return false;
    }

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

        if ((cell.zone !== zone) || !cell.isPlot || !cell.isPath || cell.isObstacle) {
          return false;
        }
      }
    }

    return true;
  }

  show() {
    for (const line of this.board.cells) {
      const text = [];

      for (const cell of line) {
        if (!cell.isPath) {
          text.push("#");
        } else if (cell.isObstacle) {
          text.push("X");
        } else if (!cell.isPlot) {
          text.push("/");
        } else {
          text.push(" ");
        }
      }

      console.log(text.join(""));
    }
  }
}

function clearInitialPathing(board) {
  for (const building of Units.buildings().values()) {
    if (building.type.isBuilding) {
      const x = building.body.x;
      const y = building.body.y;
      const r = building.body.r;

      board.clear(Math.round(x - r), Math.round(y - r), Math.round(r + r), Math.round(r + r));
    }
  }

  for (const unit of Units.resources().values()) {
    const x = Math.floor(unit.body.x);
    const y = Math.floor(unit.body.y);

    if (unit.type.isMinerals) {
      board.block(x - 1, y, 2, 1);
    } else if (unit.type.isVespene) {
      board.block(x - 1, y - 1, 3, 3);
    }
  }
}

export default new Map();
