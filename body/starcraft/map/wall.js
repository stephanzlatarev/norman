import Zone from "./zone.js";

const TRACE = false;
const SPAN = 8;

const walls = [];

export default class Wall extends Zone {

  isWall = true;

  constructor(x, y, r, blueprint) {
    super(x, y, r);

    this.blueprint = blueprint;

    walls.push(this);
  }

  getPlot(type) {
    if (type.name === "Pylon") {
      return this.blueprint.pylon;
    } else if (type.name === "ShieldBattery") {
      return this.blueprint.battery;
    } else if (!this.blueprint.left.isTaken) {
      this.blueprint.left.isTaken = true;
      return this.blueprint.left;
    } else if (!this.blueprint.center.isTaken) {
      this.blueprint.center.isTaken = true;
      return this.blueprint.center;
    } else if (!this.blueprint.right.isTaken) {
      this.blueprint.right.isTaken = true;
      return this.blueprint.right;
    }
  }

  static list() {
    return walls;
  }

}

// TODO: Move this function to Corridor to wall the given corridor
export function createWalls(board, base) {
  // There must be exactly one corridor out of the base, leading to the natural
  if (TRACE) console.log("base:", !!base.depot);
  if (!base.depot || !base.depot.corridors || (base.depot.corridors.length !== 1)) return;

  const corridorToNatural = base.depot.corridors[0];

  // The corridor to the natural must connect exactly two zones, leading to the natural
  if (TRACE) console.log("corridor to natural:", !!corridorToNatural);
  if (!corridorToNatural || !corridorToNatural.zones || (corridorToNatural.zones.length !== 2)) return;

  const natural = corridorToNatural.zones.find(zone => (zone !== base.depot));

  // There must be exactly two corridors out of the natural, one from the natural and one to be walled
  if (TRACE) console.log("natural:", !!natural);
  if (!natural || !natural.corridors || (natural.corridors.length !== 2)) return;

  const corridorToWall = natural.corridors.find(corridor => (corridor !== corridorToNatural));

  if (TRACE) console.log("corridor to wall:", !!corridorToWall);
  if (!corridorToWall) return;

  const grid = createGrid(board, corridorToWall);
  const direction = calculateDirection(natural, corridorToWall);

  if (TRACE) showGrid(grid);

  // Extract the border positions for a building of size 3
  const borderLine = [];
  for (let direction = 0; direction <= 3; direction++) {
    populateBorderLine(grid, borderLine, 3, direction);
  }

  // Split the border positions into two curves
  const split = splitBorderLine(borderLine);

  if (TRACE) { fillGrid(grid, "L", split.left); fillGrid(grid, "R", split.right); showGrid(grid); fillGrid(grid, " ", split.left); fillGrid(grid, " ", split.right); }

  // Choose where to place the wall
  const blueprint = createBlueprint(grid, split.left, split.right, direction);

  if (blueprint) {
    setBlueprintToCorridor(corridorToWall, blueprint);
    markBlueprint(board, blueprint);
  } else {
    console.log("WARNING! Unable to create wall blueprint!");
  }
}

function setBlueprintToCorridor(corridor, blueprint) {
  blueprint.left.x += corridor.x - SPAN + 0.5;
  blueprint.left.y += corridor.y - SPAN + 0.5;
  blueprint.center.x += corridor.x - SPAN + 0.5;
  blueprint.center.y += corridor.y - SPAN + 0.5;
  blueprint.right.x += corridor.x - SPAN + 0.5;
  blueprint.right.y += corridor.y - SPAN + 0.5;

  blueprint.pylon.x += corridor.x - SPAN;
  blueprint.pylon.y += corridor.y - SPAN;
  blueprint.battery.x += corridor.x - SPAN;
  blueprint.battery.y += corridor.y - SPAN;

  blueprint.choke.x += corridor.x - SPAN + 0.5;
  blueprint.choke.y += corridor.y - SPAN + 0.5;
  blueprint.rally.x += corridor.x - SPAN + 0.5;
  blueprint.rally.y += corridor.y - SPAN + 0.5;

  corridor.x = blueprint.rally.x;
  corridor.y = blueprint.rally.y;
  corridor.wall = new Wall(blueprint.rally.x, blueprint.rally.y, SPAN, blueprint);
}

function markBlueprint(board, blueprint) {
  board.mark(blueprint.left.x - 1.5, blueprint.left.y - 1.5, 3, 3, cell => (cell.isMarked = true));
  board.mark(blueprint.center.x - 1.5, blueprint.center.y - 1.5, 3, 3, cell => (cell.isMarked = true));
  board.mark(blueprint.right.x - 1.5, blueprint.right.y - 1.5, 3, 3, cell => (cell.isMarked = true));
  board.mark(blueprint.pylon.x - 1, blueprint.pylon.y - 1, 2, 2, cell => (cell.isMarked = true));
  board.mark(blueprint.battery.x - 1, blueprint.battery.y - 1, 2, 2, cell => (cell.isMarked = true));
}

function createGrid(board, corridor) {
  const minx = corridor.x - SPAN;
  const maxx = corridor.x + SPAN;
  const miny = corridor.y - SPAN;
  const maxy = corridor.y + SPAN;

  const grid = [];

  for (let row = miny; row <= maxy; row++) {
    const line = [];

    for (let col = minx; col <= maxx; col++) {
      const cell = board.cells[row][col];

      if (cell.isPlot) {
        line.push(" ");
      } else if (cell.isPath) {
        line.push("/");
      } else {
        line.push("X");
      }
    }

    grid.push(line);
  }

  return grid;
}

function populateBorderLine(grid, borderLine, blockSize, direction) {
  if ((grid.length <= 3) || (grid[0].length <= 3)) return;

  const plot = grid.map(line => line.map(cell => ((cell === " ") ? 1 : 0)));
  const path = grid.map(line => line.map(cell => ((cell !== "X") ? 1 : 0)));

  const blockCenterX = Math.ceil(blockSize / 2) - 1;
  const blockCenterY = Math.ceil(blockSize / 2) - 1;

  let rowStart = 1;
  let rowStep = 1;
  let rowEnd = grid.length - 2;
  let colStart = 1;
  let colStep = 1;
  let colEnd = grid[0].length - 2;

  if ((direction === 1) || (direction === 3)) {
    rowStart = grid.length - 2;
    rowStep = -1;
    rowEnd = 1;
  }

  if ((direction === 2) || (direction === 3)) {
    colStart = grid[0].length - 2;
    colStep = -1;
    colEnd = 1;
  }

  for (let row = rowStart; row !== rowEnd; row += rowStep) {
    for (let col = colStart; col !== colEnd; col += colStep) {
      if (grid[row][col] === " ") {
        const max = Math.min(plot[row - rowStep][col], plot[row][col - colStep]);
        const inc = (grid[row - max * rowStep][col - max * colStep] === " ") ? 1 : 0;

        plot[row][col] = max + inc;
      }

      if (grid[row][col] !== "X") {
        const max = Math.min(path[row - rowStep][col], path[row][col - colStep]);
        const inc = (grid[row - max * rowStep][col - max * colStep] !== "X") ? 1 : 0;

        path[row][col] = max + inc;

        // Allow for borderline slots
        if ((path[row][col] === blockSize) && (path[row - rowStep][col] === blockSize) && (path[row][col - colStep] === blockSize)) {
          plot[row][col] = blockSize + 1;
        }
      }
    }
  }

  for (let row = rowStart; row !== rowEnd; row += rowStep) {
    for (let col = colStart; col !== colEnd; col += colStep) {
      if (plot[row][col] !== blockSize) continue;

      // Suppress borderline slots that connect to the end of the grid
      if ((row === rowStart + rowStep) || (col === colStart + colStep)) continue;

      // Suppress borderline slots for buildings that do not connect a side to the border, but only touch the corner
      if ((plot[row - rowStep][col] === blockSize) && (plot[row][col - colStep] === blockSize)) continue;

      // Suppress non-borderline slots
      if (path[row][col] > blockSize) continue;

      borderLine.push({
        x: col - blockCenterX * colStep,
        y: row - blockCenterY * rowStep,
      });
    }
  }
}

function splitBorderLine(line) {
  const cluster = new Set();

  let pending = [];
  let wave = new Set();

  // Add unique items to the pending list
  for (const one of line) {
    if (!pending.find(p => ((p.x === one.x) && (p.y === one.y)))) {
      pending.push(one);
    }
  }

  // Select one item to start the split
  const start = pending[0];
  cluster.add(start);
  wave.add(start);

  while (wave.size) {
    const nextWave = new Set();
    const stillPending = new Set();

    for (const other of pending) {
      let processed = false;

      for (const one of wave) {
        if ((Math.abs(one.x - other.x) < 3) && (Math.abs(one.y - other.y) < 3)) {
          cluster.add(other);
          nextWave.add(other);

          processed = true;
          break;
        }
      }

      if (!processed) {
        stillPending.add(other);
      }
    }

    wave = nextWave;
    pending = stillPending;
  }

  return {
    right: cluster,
    left: pending,
  };
}

function createBlueprint(grid, leftBorderLine, rightBorderLine, direction) {
  for (const left of leftBorderLine) {
    for (const right of rightBorderLine) {
      const hd = Math.abs(left.x - right.x);
      const vd = Math.abs(left.y - right.y);

      if (!canPlaceWings(hd, vd)) continue;

      const centers = [];
      const dx = Math.sign(right.x - left.x);
      const dy = Math.sign(right.y - left.y);

      if (hd >= vd) {
        const lx = left.x + 4 * dx;
        const rx = right.x - 4 * dx;
        const lc = { x: left.x + 2 * dx, y: left.y + dy};
        const rc = { x: right.x - 2 * dx, y: right.y - dy };
        const le = { x: lc.x, y: lc.y - direction.y };
        const re = { x: rc.x, y: rc.y - direction.y };

        if (hd === 7) {
          const miny = Math.max(left.y - 2, right.y - 2);
          const maxy = Math.min(left.y + 2, right.y + 2);

          for (let y = miny; y <= maxy; y++) {
            centers.push({ x: lx, y: y, choke: lc, exit: le, direction: { y: direction.y } });
            centers.push({ x: rx, y: y, choke: rc, exit: re, direction: { y: direction.y } });
          }
        } else if ((hd === 6) || (hd === 5)) {
          centers.push({ x: lx, y: right.y - 3 * dy, choke: lc, exit: le, direction: { y: direction.y } });
          centers.push({ x: rx, y: left.y + 3 * dy, choke: rc, exit: re, direction: { y: direction.y } });
        }
      }

      if (vd >= hd) {
        const ly = left.y + 4 * dy;
        const ry = right.y - 4 * dy;
        const lc = { x: left.x + dx, y: left.y + 2 * dy };
        const rc = { x: right.x - dx, y: right.y - 2 * dy };
        const le = { x: lc.x - direction.x, y: lc.y };
        const re = { x: rc.x - direction.x, y: rc.y };

        if (vd === 7) {
          const minx = Math.max(left.x - 2, right.x - 2);
          const maxx = Math.min(left.x + 2, right.x + 2);

          for (let x = minx; x <= maxx; x++) {
            centers.push({ x: x, y: ly, choke: lc, exit: le, direction: { x: direction.x } });
            centers.push({ x: x, y: ry, choke: rc, exit: re, direction: { x: direction.x } });
          }
        } else if ((vd === 6) || (vd === 5)) {
          centers.push({ x: left.x + 3 * dx, y: ry, choke: rc, exit: re, direction: { x: direction.x } });
          centers.push({ x: right.x - 3 * dx, y: ly, choke: lc, exit: le, direction: { x: direction.x } });
        }
      }

      for (const center of centers) {
        if (!canPlaceWing(grid, center.x, center.y)) continue;

        const copy = JSON.parse(JSON.stringify(grid));
        fillGrid(copy, "#", [left, center, right], 1);

        if (center.choke.x === center.exit.x) {
          for (const line of copy) {
            line[center.choke.x] = ".";
          }
        } else {
          const line = copy[center.choke.y];
          for (let col = 0; col < line.length; col++) {
            line[col] = ".";
          }
        }
        fillGrid(copy, "x", [center.choke]);
        fillGrid(copy, "o", [center.exit]);

        const battery = selectSupport(copy, left, center, right, 6);
        if (!battery) continue;

        fillGrid(copy, "@", [battery], 1, 1, 0, 0);

        const pylon = selectSupport(copy, left, center, right, 6.5);
        if (!pylon) continue;

        fillGrid(copy, "O", [pylon], 1, 1, 0, 0);
        if (TRACE)  showGrid(copy);

        return {
          left: left,
          center: { x: center.x, y: center.y },
          right: right,
          pylon: pylon,
          battery: battery,
          choke: center.choke,
          rally: center.exit,
        };
      }
    }
  }
}

function selectSupport(grid, left, center, right, range) {
  for (let row = 1; row < grid.length - 1; row++) {
    for (let col = 1; col < grid[row].length - 1; col++) {
      if (canPlaceSupport(grid, col, row) && isGoodPlaceForSupport(col, row, left, center, right, range)) {
        return { x: col, y: row };
      }
    }
  }
}

function isGoodPlaceForSupport(x, y, left, center, right, range) {
  const squareRange = range * range;

  for (const wing of [left, center, right]) {
    // Check if distance is ok
    const dx = wing.x + 0.5 - x;
    const dy = wing.y + 0.5 - y;

    if (dx * dx + dy * dy > squareRange) return false;
  }

  // Check if the support is in the proper direction
  if ((center.direction.x > 0) && (center.x < x)) return false;
  if ((center.direction.x < 0) && (center.x > x)) return false;
  if ((center.direction.y > 0) && (center.y < y)) return false;
  if ((center.direction.y < 0) && (center.y > y)) return false;

  return true;
}

function calculateDirection(a, b) {
  return { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
}

function canPlaceWings(hd, vd) {
  if ((hd === 7) && (vd <= 4)) return true;
  if ((vd === 7) && (hd <= 4)) return true;
  if ((hd === 6) && (vd >= 1) && (vd <= 5)) return true;
  if ((vd === 6) && (hd >= 1) && (hd <= 5)) return true;
  if ((hd === 5) && (vd >= 1) && (vd <= 5)) return true;
  if ((vd === 5) && (hd >= 1) && (hd <= 5)) return true;
  if ((hd === 4) && (vd <= 2)) return true;
  if ((vd === 4) && (hd <= 2)) return true;
}

function canPlaceWing(grid, x, y) {
  return (
    (grid[y - 1][x - 1] === " ") && (grid[y - 1][x] === " ") && (grid[y - 1][x + 1] === " ") &&
    (grid[y    ][x - 1] === " ") && (grid[y    ][x] === " ") && (grid[y    ][x + 1] === " ") &&
    (grid[y + 1][x - 1] === " ") && (grid[y + 1][x] === " ") && (grid[y + 1][x + 1] === " ")
  );
}

function canPlaceSupport(grid, x, y) {
  return (
    (grid[y - 1][x - 1] === " ") && (grid[y - 1][x] === " ") &&
    (grid[y    ][x - 1] === " ") && (grid[y    ][x] === " ")
  );
}

function fillGrid(grid, symbol, list, rl, rt, rr, rb) {
  rl = (rl >= 0) ? rl : 0;
  rt = (rt >= 0) ? rt : rl;
  rr = (rr >= 0) ? rr : rl;
  rb = (rb >= 0) ? rb : rt;

  for (const one of list) {
    for (let x = one.x - rl; x <= one.x + rr; x++) {
      for (let y = one.y - rt; y <= one.y + rb; y++) {
        grid[y][x] = symbol;
      }
    }
  }
}

function showGrid(grid) {
  console.log();

  for (const line of grid) {
    const text = [];

    for (const cell of line) {
      text.push(cell);
    }

    console.log(text.join(" "));
  }

  console.log();
}
