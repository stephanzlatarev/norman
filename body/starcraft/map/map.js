import Board from "./board.js";
import Corridor from "./corridor.js";
import Zone from "./zone.js";
import Units from "../units.js";
import { createDepots } from "./depot.js";
import { createWalls } from "./wall.js";

class Map {

  create(gameInfo) {
    this.left = gameInfo.startRaw.playableArea.p0.x;
    this.top = gameInfo.startRaw.playableArea.p0.y;
    this.right = gameInfo.startRaw.playableArea.p1.x;
    this.bottom = gameInfo.startRaw.playableArea.p1.y;

    this.gameInfo = null;
    this.gameLoop = 0;
    this.loop = 0;

    this.width = this.right - this.left;
    this.height = this.bottom - this.top;

    this.board = new Board(this, gameInfo.startRaw.placementGrid, gameInfo.startRaw.pathingGrid);

    clearInitialPathing(this.board);

    this.board.path();

    markResources(this.board);

    const base = Units.buildings().values().next().value;

    createDepots(this.board, Units.resources().values(), base);
    createZones(this.board);
    markZones(this.board);

    createWalls(this.board, base);
  }

  sync(gameInfoOrEnforce, gameLoop) {
    if ((gameInfoOrEnforce === true) && (this.loop !== this.gameLoop)) {
      this.board.sync(this.gameInfo.startRaw.pathingGrid);

      this.loop = this.gameLoop;
    } else if (gameInfoOrEnforce && (gameLoop > 0)) {
      this.gameInfo = gameInfoOrEnforce;
      this.gameLoop = gameLoop;
    }
  }

  canPlace(zone, x, y, size) {
    this.sync(true);

    x = Math.floor(x);
    y = Math.floor(y);

    const cells = this.board.cells;

    if (cells[y][x].area !== cells[Math.floor(zone.y)][Math.floor(zone.x)].area) return false;

    const head = Math.floor(size / 2);
    const tail = Math.floor((size - 1) / 2);
    const minx = x - head;
    const maxx = x + tail;
    const miny = y - head;
    const maxy = y + tail;

    for (let row = miny; row <= maxy; row++) {
      const line = cells[row];

      for (let col = minx; col <= maxx; col++) {
        if (!canBuildOn(line[col])) {
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
      board.clear(building.body.x - 2.5, building.body.y - 2.5, 5, 5);
    }
  }

  for (const unit of Units.resources().values()) {
    const x = Math.floor(unit.body.x);
    const y = Math.floor(unit.body.y);

    if (unit.type.isMinerals) {
      board.clear(x - 1, y, 2, 1);
    } else if (unit.type.isVespene) {
      board.clear(x - 1, y - 1, 3, 3);
    }
  }
}

export function createZones(board) {
  const zones = {};

  for (const area of board.areas) {
    if (area.depot) {
      zones[area.id] = area.depot;
    } else {
      zones[area.id] = new Zone(area.center.x, area.center.y, area.center.margin);
    }
  }

  for (const join of board.joins) {
    const corridor = new Corridor(join.center.x, join.center.y, join.center.margin);

    for (const area of join.areas) {
      const zone = zones[area.id];

      zone.corridors.push(corridor);
      corridor.zones.push(zone);
    }
  }
}

function markResources(board) {
  for (const unit of Units.resources().values()) {
    const x = Math.floor(unit.body.x);
    const y = Math.floor(unit.body.y);

    if (unit.type.isMinerals) {
      board.mark(x - 1, y, 2, 1, cell => (cell.isObstacle = true));
    } else if (unit.type.isVespene) {
      board.mark(x - 1, y - 1, 3, 3, cell => (cell.isObstacle = true));
    } else {
      board.mark(x, y, 1, 1, cell => (cell.isObstacle = true));
    }

    unit.cell = board.cells[y][x];
  }
}

function markZones(board) {
  for (const zone of Zone.list()) {
    if (zone.isDepot) {
      board.mark(zone.x - 2.5, zone.y - 2.5, 5, 5, cell => (cell.isMarked = true));
      board.mark(zone.harvestRally.x - 0.5, zone.harvestRally.y - 0.5, 1, 1, cell => (cell.isMarked = true));
      board.mark(zone.exitRally.x - 0.5, zone.exitRally.y - 0.5, 1, 1, cell => (cell.isMarked = true));
    } else {
      board.mark(zone.x - 1, zone.y - 1, 3, 3, cell => (cell.isMarked = true));
    }
  }
}

function canBuildOn(cell) {
  return cell.isPlot && cell.isPath && !cell.isObstacle;
}

export default new Map();
