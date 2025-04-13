import Board from "./board.js";
import Pin from "./pin.js";

const ZONE_NAME_COLS = "ABCDEFGHIJ";
const ZONE_NAME_ROWS = "0123456789";
const ZONE_NAME_SUFFIX = "αβγδ";

const RANGE_FIRE = 15;

const zones = [];
const knownThreats = new Map();

export default class Zone extends Pin {

  static STANDARD_VISION_RANGE = 10;

  // Cells
  cells = new Set();
  ground = new Set();
  border = new Set();

  // Units
  workers = new Set();
  buildings = new Set();
  warriors = new Set();
  enemies = new Set();
  threats = new Set();

  // Navigation
  neighbors = new Set();
  corridors = new Map();
  range = { zones: new Set(), fire: new Set(), front: new Set() };

  constructor(cell) {
    super(cell);

    this.r = 1;
    this.rally = cell;
    this.powerPlot = cell;

    this.cells.add(cell);
    this.ground.add(cell);
    this.border.add(cell);

    cell.zone = this;

    zones.push(this);
  }

  expand(radius, shouldTakeOver) {
    const traversed = new Set();
    const centerx = Math.floor(this.cell.x);
    const centery = Math.floor(this.cell.y);
    let squareRadius = radius * radius;
    let wave = new Set();
    let last = new Set();

    traversed.add(this.cell);
    wave.add(this.cell);

    // Give it a chance to take over the cell
    this.cell.zone = null;

    while (wave.size) {
      const next = new Set();

      for (const cell of wave) {
        if (!cell.zone || shouldTakeOver) {
          if (cell.zone !== this) {
            if (cell.zone) cell.zone.cells.delete(cell);

            if (!cell.isObstructed()) {
              this.ground.add(cell);
              this.border.add(cell);
            }

            this.cells.add(cell);
            cell.zone = this;
          }

          for (const neighbor of cell.edges) {
            if (traversed.has(neighbor)) continue;

            traversed.add(neighbor);

            if (!neighbor.isPath) continue;

            const squareDistance = (centerx - neighbor.x) * (centerx - neighbor.x) + (centery - neighbor.y) * (centery - neighbor.y);

            if (squareDistance < squareRadius) {
              next.add(neighbor);
            }
          }
        }
      }

      for (const cell of last) {
        if (isSurroundedBySameZoneGround(this.ground, cell)) {
          this.border.delete(cell);
        }
      }

      last = wave;
      wave = next;
    }

    for (const cell of this.border) {
      if (isSurroundedBySameZoneGround(this.ground, cell)) {
        this.border.delete(cell);
      } else {
        const squareDistance = (centerx - cell.x) * (centerx - cell.x) + (centery - cell.y) * (centery - cell.y);

        if (squareDistance > squareRadius) {
          squareRadius = squareDistance;
        }
      }
    }

    this.r = Math.floor(Math.sqrt(squareRadius));
  }

  addUnit(unit) {
    if (this === unit.zone) return;
    if (unit.isEnemy && !unit.isVisible) return;

    if (unit.isHallucination) {
      // Ignore the unit
    } else if (unit.isEnemy) {
      const previous = knownThreats.get(unit.tag);

      if (previous && previous.zone && ((previous.zone !== this) || (previous !== unit))) {
        previous.zone.enemies.delete(previous);
        previous.zone.threats.delete(previous);
      }

      if (unit.zone && (unit.zone !== this)) {
        unit.zone.enemies.delete(unit);
        unit.zone.threats.delete(unit);
      }

      this.enemies.add(unit);
      this.threats.add(unit);

      knownThreats.set(unit.tag, unit);
    } else if (unit.type.isWorker) {
      if (unit.zone && (unit.zone !== this)) unit.zone.workers.delete(unit);

      this.workers.add(unit);
    } else if (unit.type.isWarrior) {
      if (unit.zone && (unit.zone !== this)) unit.zone.warriors.delete(unit);

      this.warriors.add(unit);
    } else if (unit.type.isBuilding) {
      if (unit.zone && (unit.zone !== this)) unit.zone.buildings.delete(unit);

      this.buildings.add(unit);
    }

    unit.zone = this;
  }

  removeUnit(unit) {
    if (unit.zone !== this) return;

    if (unit.isHallucination) {
      // Ignore the unit
    } else if (unit.isEnemy) {
      this.enemies.delete(unit);
    } else if (unit.type.isWorker) {
      this.workers.delete(unit);
    } else if (unit.type.isWarrior && !unit.type.isWorker) {
      this.warriors.delete(unit);
    } else if (unit.type.isBuilding) {
      this.buildings.delete(unit);
    }
  }

  remove() {
    const index = zones.indexOf(this);

    if (index >= 0) {
      zones.splice(index, 1);
    }

    for (const cell of this.cells) {
      cell.zone = null;
    }
  }

  static list() {
    return zones;
  }

}

class Corridor {

  constructor(path) {
    const a = path[0];
    const b = path[path.length - 1];

    this.start = a.zone;
    this.end = b.zone;
    this.distance = Math.sqrt(calculateSquareDistance(a, b));

    this.path = reducePath(path, a, b);
    this.length = calculatePathLength(this.path);
    this.squareLength = this.length * this.length;
    this.curvature = this.length - this.distance;
  }

}

function isSurroundedBySameZoneGround(ground, cell) {
  if (cell.neighbors.length < 8) return false;

  for (const neighbor of cell.neighbors) {
    if (!ground.has(neighbor)) return false;
  }

  return true;
}

export function createZones() {
  const free = new Set([...Board.ground].filter(cell => (!cell.zone && !cell.isObstructed())));
  let margins = calculateMargins(free);
  let count = -1;

  while ((margins.length > 1) && (zones.length > count)) {
    count = zones.length;

    convertMarginPeaksToZones(margins, free);

    margins = calculateMargins(free);
  }

  zones.sort((a, b) => (b.r - a.r));

  expandZonesWithUnclaimedGroundCells();
  expandZonesWithNonGroundCells();
  nameZones();
  identifyNeighboringZones();
  identifyRanges();
}

function calculateMargins(cells) {
  const space = new Set(cells);
  const margins = [];

  let wave = new Set();

  // The first wave consist of all cells in the space that border with cells outside the space
  for (const cell of space) {
    if ((cell.neighbors.length < 8) || cell.neighbors.find(neighbor => !space.has(neighbor))) {
      wave.add(cell);
    }
  }

  // Get wave by wave of cells that border the previous wave
  while (wave.size) {
    margins.push(wave);

    for (const cell of wave) {
      space.delete(cell);
    }

    const next = new Set();

    for (const cell of wave) {
      for (const neighbor of cell.edges) {
        if (space.has(neighbor)) {
          next.add(neighbor);
        }
      }
    }

    wave = next;
  }

  return margins;
}

function convertMarginPeaksToZones(margins, free) {
  for (let i = margins.length - 1; i >= 1; i--) {
    const cells = margins[i];

    for (const cell of cells) {
      if (free.has(cell)) {
        const proximity = findProximityCells(free, cells, cell.x, cell.y, Zone.STANDARD_VISION_RANGE);
        const zone = new Zone(findCenter(proximity));

        zone.expand(Zone.STANDARD_VISION_RANGE);

        if (zone.ground.size > zone.border.size) {
          const center = findCenter(zone.ground, zone.border);
  
          zone.cell = center;
          zone.rally  = center;
          zone.powerPlot = center;
          zone.x = center.x;
          zone.y = center.y;
        } else {
          zone.remove();
        }

        for (const one of zone.cells) {
          free.delete(one);
        }
      }
    }
  }
}

function findProximityCells(space, cells, x, y, span) {
  const proximity = [];

  for (const cell of cells) {
    if (!space.has(cell)) continue;
    if (cell.x < x - span) continue;
    if (cell.x > x + span) continue;
    if (cell.y < y - span) continue;
    if (cell.y > y + span) continue;

    proximity.push(cell);
  }

  return proximity;
}

function findCenter(cells, exclude) {
  let sumx = 0;
  let sumy = 0;
  let count = 0;

  for (const cell of cells) {
    if (exclude && exclude.has(cell)) continue;

    sumx += cell.x;
    sumy += cell.y;
    count++;
  }

  const midx = sumx / count;
  const midy = sumy / count;

  let bestCenter;
  let bestDistance = Infinity;

  for (const cell of cells) {
    const distance = (cell.x - midx) * (cell.x - midx) + (cell.y - midy) * (cell.y - midy);

    if (distance < bestDistance) {
      bestCenter = cell;
      bestDistance = distance;
    }
  }

  return bestCenter;
}

function expandZonesWithUnclaimedGroundCells() {
  let wave = new Set();

  for (const zone of zones) {
    for (const cell of zone.border) {
      wave.add(cell);
    }
  }

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      for (const neighbor of cell.edges) {
        if (!neighbor.zone && !neighbor.isObstructed()) {
          neighbor.zone = cell.zone;

          // Expand the ground and border of the zone
          neighbor.zone.cells.add(neighbor);
          neighbor.zone.ground.add(neighbor);
          neighbor.zone.border.add(neighbor);

          next.add(neighbor);
        }
      }
    }

    wave = next;
  }

  // Slim down the borders
  for (const zone of zones) {
    for (const cell of zone.border) {
      if (isSurroundedBySameZoneGround(zone.ground, cell)) {
        zone.border.delete(cell);
      }
    }
  }
}

function expandZonesWithNonGroundCells() {
  let wave = new Set();

  for (const zone of zones) {
    for (const cell of zone.cells) {
      wave.add(cell);
    }
  }

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      for (const neighbor of cell.neighbors) {
        if (!neighbor.zone) {
          neighbor.zone = cell.zone;
          neighbor.zone.cells.add(neighbor);

          next.add(neighbor);
        }
      }
    }

    wave = next;
  }
}

function nameZones() {
  const table = [];
  const boxx = 10 / (Board.right - Board.left);
  const boxy = 10 / (Board.bottom - Board.top);

  for (let row = 0; row < 10; row++) {
    const list = [];

    for (let col = 0; col < 10; col++) {
      list.push([]);
    }

    table.push(list);
  }

  for (const zone of zones) {
    const row = Math.floor((zone.y - Board.top) * boxy);
    const col = Math.floor((zone.x - Board.left) * boxx);
    table[row][col].push(zone);
  }

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const list = table[row][col];

      if (list.length === 1) {
        list[0].name = ZONE_NAME_COLS[col] + ZONE_NAME_ROWS[row];
      } else if (list.length) {
        const prefix = ZONE_NAME_COLS[col] + ZONE_NAME_ROWS[row];

        list.sort(orderZonesBySizeAndPosition);

        for (let i = 0; i < list.length; i++) {
          list[i].name = prefix + (ZONE_NAME_SUFFIX[i] || "x");
        }
      }
    }
  }
}

function orderZonesBySizeAndPosition(a, b) {
  if (b.r !== a.r) return b.r - a.r;
  if (b.y !== a.y) return a.y - b.y;
  return a.x - b.x;
}

function identifyNeighboringZones() {
  const corridors = new Set();

  for (const zone of zones) {
    zone.corridors.clear();
    zone.neighbors.clear();
  }

  for (const zone of zones) {
    findCorridors(zone, corridors);
  }

  for (const corridor of corridors) {
    corridor.start.neighbors.add(corridor.end);
    corridor.end.neighbors.add(corridor.start);
  }

  const ordered = [...corridors].sort((a, b) => (b.length - a.length));
  const curved = ordered.filter(a => (a.curvature >= 1));

  removeIntersectingCorridors(corridors, ordered);
  removeObstructedCorridors(corridors, curved);
  removeObtuseCorridors(corridors, ordered);
}

function findCorridors(zone, corridors) {
  const traversed = new Set();
  const blocked = new Set();
  let wave = new Set();

  wave.add([zone.rally]);
  traversed.add(zone.rally);

  while (wave.size) {
    const next = new Set();

    for (const path of wave) {
      const cell = path[path.length - 1];

      if (blocked.has(cell.zone)) continue;

      if ((cell === cell.zone.rally) && (cell.zone !== zone)) {
        blocked.add(cell.zone);

        const corridor = new Corridor(path);
        const alternative = cell.zone.corridors.get(zone);

        if (alternative && (alternative.length <= corridor.length)) {
          corridors.add(alternative);
          zone.corridors.set(cell.zone, alternative);
        } else {
          corridors.add(corridor);
          zone.corridors.set(cell.zone, corridor);
          cell.zone.corridors.set(zone, corridor);

          if (alternative) {
            corridors.delete(alternative);
          }
        }
      } else {
        for (const neighbor of cell.neighbors) {
          if (!neighbor.isPath) continue;
          if (traversed.has(neighbor)) continue;
          if (blocked.has(neighbor.zone)) continue;

          next.add([...path, neighbor]);
          traversed.add(neighbor);
        }
      }
    }

    wave = next;
  }
}

function removeIntersectingCorridors(corridors, list) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i];

    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];

      if (doCorridorsIntersect(a, b)) {
        removeCorridor(corridors, a);
      }
    }
  }
}

// Obtuse corridors are those that participate in a triangle of corridors with angle > 90 degrees
function removeObtuseCorridors(corridors, list) {
  for (const c of list) {
    if (!corridors.has(c)) continue;

    const azone = c.start; 
    const bzone = c.end; 

    for (const czone of azone.neighbors) {
      if (!bzone.neighbors.has(czone)) continue;

      const a = azone.corridors.get(czone);
      const b = bzone.corridors.get(czone);

      if (c.squareLength > a.squareLength + b.squareLength) {
        removeCorridor(corridors, c);
      }
    }
  }
}

// Remove the corridor with greatest curvature of a triangle with at least one curved corridor
function removeObstructedCorridors(corridors, list) {
  for (const c of list) {
    if (!corridors.has(c)) continue;

    for (const zone of c.start.neighbors) {
      if (c.end.neighbors.has(zone)) {
        // The corridor participates in a triangle
        removeCorridor(corridors, c);
        break;
      }
    }
  }
}

function removeCorridor(corridors, corridor) {
  corridors.delete(corridor);
  corridor.start.corridors.delete(corridor.end);
  corridor.start.neighbors.delete(corridor.end);
  corridor.end.corridors.delete(corridor.start);
  corridor.end.neighbors.delete(corridor.start);
}

function identifyRanges() {
  // Identiify fire range
  for (const zone of zones) {
    const squareFireRange = (zone.r + RANGE_FIRE) * (zone.r + RANGE_FIRE);

    for (const other of zones) {
      if (zone === other) continue;

      if (calculateSquareDistance(zone, other) < squareFireRange) {
        zone.range.fire.add(other);
        zone.range.zones.add(other);
      }
    }
  }

  // Identify front range
  for (const zone of zones) {
    for (const fire of zone.range.fire) {
      for (const neighbor of fire.neighbors) {
        if (!zone.range.fire.has(neighbor)) {
          zone.range.front.add(neighbor);
          zone.range.zones.add(neighbor);
        }
      }
    }
  }
}

function doCorridorsIntersect(a, b) {
  const a1 = a.start.rally;
  const a2 = a.end.rally;
  const b1 = b.start.rally;
  const b2 = b.end.rally;

  const d = (a2.x - a1.x) * (b2.y - b1.y) - (b2.x - b1.x) * (a2.y - a1.y);

  if (d) {
    const lambda = ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / d;
    const gamma = ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / d;

    return (0 < lambda) && (lambda < 1) && (0 < gamma) && (gamma < 1);
  }
};

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

function calculatePathLength(path) {
  if (!path || !path.length) return 0;

  let length = 0;
  let last = path[0];

  for (const cell of path) {
    if (cell !== last) {
      length += Math.sqrt(calculateSquareDistance(cell, last));
      last = cell;
    }
  }

  return length;
}

function reducePath(path, start, end) {
  const segments = [
    { cell: start, path: path, reduce: true }, // The entire path is the segment to reduce
    { cell: end, path: [], reduce: false }     // This is stop holder of the end point in the path
  ];
  let length;

  while (length !== segments.length) {
    length = segments.length;

    for (const segment of segments) {
      if (segment.reduce && (segment.path.length > 2)) {
        reducePathSegment(segments, segment);
      }
    }
  }

  return segments.map(segment => segment.cell);
}

function reducePathSegment(segments, segment) {
  const start = segment.path[0];
  const end = segment.path[segment.path.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  if (!reducePathSegmentByTurn(segments, segment, start, dx, dy, adx, ady)) {
    if (!reducePathSegmentByObstruction(segments, segment, start, dx, dy, adx, ady)) {
      segment.reduce = false;
    }
  }
}

function reducePathSegmentByTurn(segments, segment, start, dx, dy, adx, ady) {
  let turnDistance = 0;
  let turnCell;
  let turnIndex;

  if (adx >= ady) {
    for (let i = 1; i < segment.path.length; i++) {
      const cell = segment.path[i];

      if (dx > 0) {
        if ((cell.x < start.x) && (start.x - cell.x > turnDistance)) {
          turnDistance = start.x - cell.x;
          turnCell = cell;
          turnIndex = i;
        }
      } else {
        if ((cell.x > start.x) && (cell.x - start.x > turnDistance)) {
          turnDistance = cell.x - start.x;
          turnCell = cell;
          turnIndex = i;
        }
      }
    }
  } else {
    for (let i = 1; i < segment.path.length; i++) {
      const cell = segment.path[i];

      if (dy > 0) {
        if ((cell.y < start.y) && (start.y - cell.y > turnDistance)) {
          turnDistance = start.y - cell.y;
          turnCell = cell;
          turnIndex = i;
        }
      } else {
        if ((cell.y > start.y) && (cell.y - start.y > turnDistance)) {
          turnDistance = cell.y - start.y;
          turnCell = cell;
          turnIndex = i;
        }
      }
    }
  }

  if (turnCell) {
    const left = { cell: start, path: [...segment.path.slice(0, turnIndex), turnCell], reduce: true };
    const right  = { cell: turnCell, path: [turnCell, ...segment.path.slice(turnIndex)], reduce: true };

    if ((left.path.length > 1) && (right.path.length > 1)) {
      segments.splice(segments.indexOf(segment), 1, left, right);
    } else {
      turnCell = null;
    }
  }

  return !!turnCell;
}

function reducePathSegmentByObstruction(segments, segment, start, dx, dy, adx, ady) {
  const steps = Math.max(adx, ady) - 1;
  let stepx;
  let stepy;

  if (adx >= ady) {
    stepx = (dx > 0) ? 1 : -1;
    stepy = dy / adx;
  } else {
    stepx = dx / ady;
    stepy = (dy > 0) ? 1 : -1;
  }

  let pathCell = start;
  let pathCellIndex = 0;
  let splitCell = null;
  let splitDistance = 0;
  let splitPathIndex = 0;

  for (let i = 1; i < steps; i++) {
    const x = start.x + stepx * i;
    const y = start.y + stepy * i;
    const idealPathCell = Board.cell(x, y);

    let clearx = 0;
    let cleary = 0;

    if (adx >= ady) {
      if (dx > 0) {
        while (pathCell.x < x) pathCell = segment.path[++pathCellIndex];
      } else {
        while (pathCell.x > x) pathCell = segment.path[++pathCellIndex];
      }

      cleary = (pathCell.y > idealPathCell.y) ? 1 : -1;
    } else {
      if (dy > 0) {
        while (pathCell.y < y) pathCell = segment.path[++pathCellIndex];
      } else {
        while (pathCell.y > y) pathCell = segment.path[++pathCellIndex];
      }

      clearx = (pathCell.x > idealPathCell.x) ? 1 : -1;
    }

    const clearPathCell = findClearPathCell(idealPathCell, clearx, cleary);
    const distance = Math.abs(idealPathCell.x - clearPathCell.x) + Math.abs(idealPathCell.y - clearPathCell.y);

    if (distance > splitDistance) {
      splitDistance = distance;
      splitCell = clearPathCell;
      splitPathIndex = pathCellIndex;
    }
  }

  if (splitCell) {
    // Perform reduction of path
    const left = { cell: start, path: [...segment.path.slice(0, splitPathIndex), splitCell], reduce: true };
    const right  = { cell: splitCell, path: [splitCell, ...segment.path.slice(splitPathIndex + 1)], reduce: true };

    if ((left.path.length > 1) && (right.path.length > 1)) {
      segments.splice(segments.indexOf(segment), 1, left, right);
    } else {
      splitCell = null;
    }
  }

  return !!splitCell;
}

function findClearPathCell(start, dx, dy) {
  let distance = 0;
  let cell = start;

  while (!cell.isPath || cell.isObstacle) {
    cell = Board.cell(cell.x + dx, cell.y + dy);
    distance++;
  }

  return cell;
}
