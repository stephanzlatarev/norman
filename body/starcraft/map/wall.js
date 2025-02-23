import Map from "./map.js";
import Tiers from "./tier.js";
import { syncTiers } from "./tier.js";

const TRACE = false;
const SPAN = 8;

const walls = [];

export default class Wall {

  isWall = true;

  constructor(cell, r, base, field, blueprint) {
    this.base = base;
    this.field = field;
    this.blueprint = blueprint;

    walls.push(this);
  }

  getPlot(type) {
    const blueprint = this.blueprint;

    if ((type === "Pylon") || (type.name === "Pylon")) {
      return blueprint.pylon;
    } else if ((type === "ShieldBattery") || (type.name === "ShieldBattery")) {
      return Map.accepts(blueprint.battery.x, blueprint.battery.y, 2) ? blueprint.battery : null;
    } else if (Map.accepts(blueprint.left.x, blueprint.left.y, 3)) {
      return blueprint.left;
    } else if (Map.accepts(blueprint.center.x, blueprint.center.y, 3)) {
      return blueprint.center;
    } else if (Map.accepts(blueprint.right.x, blueprint.right.y, 3)) {
      return blueprint.right;
    }
  }

  static list() {
    return walls;
  }

}

// TODO: Move this function to Corridor to wall the given corridor
export function createWalls() {
  // Temporarily disabled
  return;

  if (TRACE) console.log("tiers:", Tiers ? Tiers.length : "not found!");
  if (!Tiers || !Tiers.length) return;

  const natural = findNaturalExpansion();

  if (TRACE) console.log("natural:", natural ? natural.name : "not found!");
  if (!natural) return;

  const corridorZones = findCorridorZones(natural);

  if (TRACE && !corridorZones) console.log("corridor not found");
  if (!corridorZones) return;

  if (TRACE) console.log("corridor:", corridorZones.corridor.name);

  const center = { x: Math.floor(corridorZones.corridor.x), y: Math.floor(corridorZones.corridor.y) };
  const grid = createGrid(board, center);
  const direction = calculateDirection(natural, center);

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
    setBlueprintToCorridor(board, corridorZones, center, blueprint);
    syncTiers(true);
  } else {
    console.log("WARNING! Unable to create wall blueprint!");
  }
}

function findNaturalExpansion() {
  for (let i = 1; i < Tiers.length; i++) {
    const tier = Tiers[i];
    let expansion;

    for (const zone of tier.zones) {
      if (!zone.isDepot) continue;

      if (!expansion) {
        expansion = zone;
      } else {
        // At least two depots are found in this tier. There's no single expansion
        return;
      }
    }

    if (expansion) {
      return expansion;
    }
  }
}

function findCorridorZones(natural) {
  const exits = [];

  for (const neighbor of natural.neighbors) {
    if (neighbor.isCorridor || (neighbor.tier.level < natural.tier.level)) continue;

    if (zoneLeadsToHigherTiers(neighbor)) {
      exits.push(findCorridorBetweenZones(natural, neighbor));
    }
  }

  const corridor = findMidCorridor(exits);
  if (!corridor) return;

  const field = findZoneAfterCorridor(natural, corridor);

  return { base: natural, corridor, field };
}

function zoneLeadsToHigherTiers(zone) {
  for (const neighbor of zone.neighbors) {
    if (!neighbor.isCorridor && (neighbor.tier.level > zone.tier.level)) return true;
  }
}

function findCorridorBetweenZones(a, b) {
  for (const corridor of a.corridors) {
    for (const zone of corridor.zones) {
      if (zone === b) {
        return corridor;
      }
    }
  }
}

function findZoneAfterCorridor(zone, corridor) {
  for (const neighbor of corridor.zones) {
    if (neighbor !== zone) {
      return neighbor;
    }
  }
}

function findMidCorridor(list) {
  if (!list.length) return;

  let minx = Infinity;
  let maxx = 0;
  let miny = Infinity;
  let maxy = 0;

  for (const one of list) {
    if (!one) continue;

    minx = Math.min(minx, one.x);
    maxx = Math.max(maxx, one.x);
    miny = Math.min(miny, one.y);
    maxy = Math.max(maxy, one.y);
  }

  if (!maxx || !maxy) return;

  const midx = (minx + maxx) / 2;
  const midy = (miny + maxy) / 2;

  list.sort((a, b) => (Math.abs(a.x - midx) + Math.abs(a.y - midy) - Math.abs(b.x - midx) - Math.abs(b.y - midy) ));

  return list[0];
}

function setBlueprintToCorridor(board, corridorZones, center, blueprint) {
  const { corridor, base, field } = corridorZones;

  blueprint.left.x += center.x - SPAN + 0.5;
  blueprint.left.y += center.y - SPAN + 0.5;
  blueprint.center.x += center.x - SPAN + 0.5;
  blueprint.center.y += center.y - SPAN + 0.5;
  blueprint.right.x += center.x - SPAN + 0.5;
  blueprint.right.y += center.y - SPAN + 0.5;

  blueprint.pylon.x += center.x - SPAN;
  blueprint.pylon.y += center.y - SPAN;
  blueprint.battery.x += center.x - SPAN;
  blueprint.battery.y += center.y - SPAN;

  blueprint.choke.x += center.x - SPAN + 0.5;
  blueprint.choke.y += center.y - SPAN + 0.5;
  blueprint.rally.x += center.x - SPAN + 0.5;
  blueprint.rally.y += center.y - SPAN + 0.5;

  const wall = new Wall(board.cells[Math.floor(blueprint.rally.y)][Math.floor(blueprint.rally.x)], SPAN, base, field, blueprint);

  wall.replace(corridor);

  // Set the wall as in fire range in neighbor zones
  wall.range.zones.add(base);
  wall.range.zones.add(wall);
  wall.range.zones.add(field);
  wall.range.fire.add(wall);
  wall.range.fire.add(field);
  wall.range.front.add(base);
  base.range.zones.add(wall);
  base.range.fire.add(wall);
  field.range.zones.add(wall);
  field.range.fire.add(wall);

  // Set the wall as the zone to all cells near the wall
  for (const one of [blueprint.left, blueprint.center, blueprint.right]) {
    assignCellsToWall(board, wall, one.x - 1.5, one.x + 0.5, one.y - 1.5, one.y + 0.5);
  }
  for (const one of [blueprint.pylon, blueprint.battery]) {
    assignCellsToWall(board, wall, one.x - 1, one.x, one.y - 1, one.y);
  }
  for (const one of [blueprint.choke, blueprint.rally]) {
    assignCellsToWall(board, wall, one.x - 0.5, one.x - 0.5, one.y - 0.5, one.y - 0.5);
  }
}

function assignCellsToWall(board, wall, minx, maxx, miny, maxy) {
  for (let y = miny; y <= maxy; y++) {
    for (let x = minx; x <= maxx; x++) {
      const cell = board.cells[y][x];

      if (cell && cell.zone && (cell.zone !== wall)) {
        cell.zone.cells.delete(cell);

        wall.cells.add(cell);
        cell.zone = wall;
      }
    }
  }
}

function createGrid(board, center) {
  const minx = center.x - SPAN;
  const maxx = center.x + SPAN;
  const miny = center.y - SPAN;
  const maxy = center.y + SPAN;

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
        const lcx = left.x + 2 * dx;
        const rcx = right.x - 2 * dx;

        if (hd === 7) {
          const miny = Math.max(left.y - 2, right.y - 2);
          const maxy = Math.min(left.y + 2, right.y + 2);

          for (let y = miny; y <= maxy; y++) {
            const lcy = (left.y + y) / 2;
            const rcy = (right.y + y) / 2;

            centers.push({ x: lx, y: y, choke: { x: lcx, y: lcy }, exit: { x: lcx, y: lcy - direction.y }, direction: { y: direction.y } });
            centers.push({ x: rx, y: y, choke: { x: rcx, y: rcy }, exit: { x: rcx, y: rcy - direction.y }, direction: { y: direction.y } });
          }
        } else if ((hd === 6) || (hd === 5)) {
          const ly = left.y + 3 * dy;
          const ry = right.y - 3 * dy;
          const lcy = (left.y + ry) / 2;
          const rcy = (right.y + ly) / 2;

          centers.push({ x: lx, y: ry, choke: { x: lcx, y: lcy }, exit: { x: lcx, y: lcy - direction.y }, direction: { y: direction.y } });
          centers.push({ x: rx, y: ly, choke: { x: rcx, y: rcy }, exit: { x: rcx, y: rcy - direction.y }, direction: { y: direction.y } });
        }
      }

      if (vd >= hd) {
        const ly = left.y + 4 * dy;
        const ry = right.y - 4 * dy;
        const lcy = left.y + 2 * dy;
        const rcy = right.y - 2 * dy;

        if (vd === 7) {
          const minx = Math.max(left.x - 2, right.x - 2);
          const maxx = Math.min(left.x + 2, right.x + 2);

          for (let x = minx; x <= maxx; x++) {
            const lcx = (left.x + x) / 2;
            const rcx = (right.x + x) / 2;

            centers.push({ x: x, y: ly, choke: { x: lcx, y: lcy }, exit: { x: lcx - direction.x, y: lcy }, direction: { x: direction.x } });
            centers.push({ x: x, y: ry, choke: { x: rcx, y: rcy }, exit: { x: rcx - direction.x, y: rcy }, direction: { x: direction.x } });
          }
        } else if ((vd === 6) || (vd === 5)) {
          const lx = left.x + 3 * dx;
          const rx = right.x - 3 * dx;
          const lcx = (left.x + rx) / 2;
          const rcx = (right.x + lx) / 2;

          centers.push({ x: lx, y: ry, choke: { x: rcx, y: rcy }, exit: { x: rcx - direction.x, y: rcy }, direction: { x: direction.x } });
          centers.push({ x: rx, y: ly, choke: { x: lcx, y: lcy }, exit: { x: lcx - direction.x, y: lcy }, direction: { x: direction.x } });
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

    if (wing === center) {
      // Check if the support is in the proper direction
      if ((center.direction.x > 0) && (dx < 0)) return false;
      if ((center.direction.x < 0) && (dx > 0)) return false;
      if ((center.direction.y > 0) && (dy < 0)) return false;
      if ((center.direction.y < 0) && (dy > 0)) return false;
    }

    if (dx * dx + dy * dy > squareRange) return false;
  }

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
