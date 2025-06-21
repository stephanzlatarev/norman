import Board from "./board.js";
import Depot from "./depot.js";
import Zone from "./zone.js";

const WALL_PLOT = [
  "???    ",
  "?      ",
  "X      ",
  "X--    ",
  "X---   ",
  "----   ",
  "--XXX  ",
];
const TOP_RIGHT_PLOT = WALL_PLOT.join("");
const TOP_LEFT_PLOT = [...WALL_PLOT].map((line) => line.split("").reverse().join("")).join("");
const BOTTOM_RIGHT_PLOT = [...WALL_PLOT].reverse().join("");
const BOTTOM_LEFT_PLOT = [...WALL_PLOT].map((line) => line.split("").reverse().join("")).reverse().join("");

const reserved = new Set();

class Site {

  constructor(x, y) {
    this.x = x;
    this.y = y;

    for (let yy = y - 2; yy <= y + 2; yy++) {
      for (let xx = x - 3; xx <= x + 3; xx++) {
        reserved.add(Board.cell(xx, yy));
      }
    }
  }

}

class BlockSite extends Site {

  constructor(x, y) {
    super(x + 4, y + 0.5);

    this.pylon = [Board.cell(x + 4, y - 1)];
    this.small = [Board.cell(x + 2, y - 1), Board.cell(x + 6, y - 1)];
    this.medium = [Board.cell(x + 2, y + 1), Board.cell(x + 5, y + 1)];
    this.wall = [];
    this.battery = [];
  }

  reverse() {
    this.pylon = this.pylon.map(cell => Board.cell(cell.x, cell.y + 3));
    this.small = this.small.map(cell => Board.cell(cell.x, cell.y + 3));
    this.medium = this.medium.map(cell => Board.cell(cell.x, cell.y - 2));
  }

}

class WallSite extends Site {

  isWall = true;

  constructor(x, y, dx, dy) {
    super(x + 0.5, y + 0.5);

    const sx = dx > 0;
    const sy = dy > 0;

    this.dy = dy;
    this.cell = Board.cell(x, y);
    this.pylon = [Board.cell(x + (sx ? 2 : -1), y + (sy ? 2 : -1))];
    this.small = [];
    this.medium = [Board.cell(x + (sx ? 2 : -2), y + (sy ? -1 : 1))];
    this.battery = [Board.cell(x + (sx ? -1 : 2), y + (sy ? 2 : -1))];
    this.wall = [Board.cell(x, y + dy)];
  }

}

export function createSites() {
  for (const zone of Zone.list()) {
    // Center of all zones are reserved for the depot or for army movements
    for (let y = zone.y - 2; y <= zone.y + 2; y++) {
      for (let x = zone.x - 2; x <= zone.x + 2; x++) {
        reserved.add(Board.cell(x, y));
      }
    }
  }

  for (const depot of Depot.list()) {
    const sites = [];
    let starty = depot.cell.y;

    if (depot.depot) {
      const wall = createWallSite(depot, sites);

      if (wall) {
        starty = Math.floor(wall.y);
      }
    }

    createSiteLine(depot, sites, starty);

    for (let y = starty + 6, count = -1; count !== sites.length; y += 6) {
      count = sites.length;
      createSiteLine(depot, sites, y);
    }

    for (let y = starty - 6, count = -1; count !== sites.length; y -= 6) {
      count = sites.length;
      createSiteLine(depot, sites, y);
    }

    if (depot === Depot.home) {
      for (const site of sites) {
        if ((site.y > starty) && site.reverse) {
          site.reverse();
        }
      }
    }

    depot.sites = sites;
  }
}

function createWallSite(depot, sites) {
  for (const cell of depot.border) {
    const site = getWallSite(cell);

    if (site) {
      sites.push(site);

      return site;
    }
  }
}

function getWallSite(cell) {
  // Check if this cell is blocked
  if (!cell.isPlot) return;
  if (cell.isObstacle) return;

  // Check if exactly two edges are paths
  let edges = 0;
  for (const edge of cell.edges) {
    if (edge.isPath && !edge.isPlot && !edge.isObstacle) edges++;
  }
  if (edges !== 2) return;

  const plots = [];
  for (let y = cell.y - 3; y <= cell.y + 3; y++) {
    for (let x = cell.x - 3; x <= cell.x + 3; x++) {
      const c = Board.cell(x, y);

      if (c && c.isPath && !c.isObstacle) {
        plots.push(c.isPlot ? " " : "-");
      } else {
        plots.push("X");
      }
    }
  }
  const grid = plots.join("");

  if (matches(grid, TOP_RIGHT_PLOT)) {
    return new WallSite(cell.x, cell.y, 1, -1);
  } else if (matches(grid, TOP_LEFT_PLOT)) {
    return new WallSite(cell.x, cell.y, -1, -1);
  } else if (matches(grid, BOTTOM_RIGHT_PLOT)) {
    return new WallSite(cell.x, cell.y, 1, 1);
  } else if (matches(grid, BOTTOM_LEFT_PLOT)) {
    return new WallSite(cell.x, cell.y, -1, 1);
  }
}

function matches(grid, pattern) {
  for (let i = 0; i < grid.length; i++) {
    if ((grid[i] !== pattern[i]) && (pattern[i] !== "?")) return false;
  }

  return true;
}

function createSiteLine(zone, sites, y) {
  const border = [...zone.border].filter((cell) => cell.y === y).sort((a, b) => a.x - b.x);
  if (!border.length) return;

  const left = getSiteLineEnd(border[0], -1);
  const rigth = getSiteLineEnd(border[border.length - 1], +1);
  const list = getSiteLineBounds(left, rigth, y);

  if (list) {
    for (const bounds of list) {
      // The usable width is the number of cells from left to right minus the paths on both sides
      const width = bounds.right - bounds.left - 1;
      const count = Math.floor(width / 6);
      const step = 6 + (width % 6) / count;

      for (let x = bounds.left, i = 0; i < count; i++, x += step) {
        sites.push(new BlockSite(Math.floor(x), y));
      }
    }
  }
}

function getSiteLineEnd(cell, dx) {
  let x = cell.x;

  while (cell && cell.isPlot) {
    x = cell.x;
    cell = Board.cell(x + dx, cell.y);
  }

  return x;
}

function getSiteLineBounds(left, right, centery) {
  const list = [];
  let start = left - 1;
  let started = false;
  let x = left;

  while (x < right) {
    if (isSiteVertical(x, centery)) {
      if (!started) {
        start = x;
        started = true;
      }
    } else {
      if (started) {
        const width = x - start;

        if (width >= 8) {
          list.push({ left: start, right: x - 1 });
        }
      }

      start = x;
      started = false;
    }

    x++;
  }

  if (started) {
    const width = x - start;

    if (width >= 8) {
      list.push({ left: start, right: x - 1 });
    }
  }

  return list;
}

function isSiteVertical(centerx, centery) {
  return isSitePath(Board.cell(centerx, centery - 3)) &&
         isSitePlot(Board.cell(centerx, centery - 2)) &&
         isSitePlot(Board.cell(centerx, centery - 1)) &&
         isSitePlot(Board.cell(centerx, centery    )) &&
         isSitePlot(Board.cell(centerx, centery + 1)) &&
         isSitePlot(Board.cell(centerx, centery + 2)) &&
         isSitePath(Board.cell(centerx, centery + 3));
}

function isSitePath(cell) {
  return cell && cell.isPath && !cell.isObstacle && !reserved.has(cell);
}

function isSitePlot(cell) {
  return cell && cell.isPlot && !cell.isObstacle && !reserved.has(cell);
}
