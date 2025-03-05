import Board from "./board.js";
import Pin from "./pin.js";

const ZONE_NAME_COLS = "ABCDEFGHIJ";
const ZONE_NAME_ROWS = "0123456789";
const ZONE_NAME_SUFFIX = "αβγδ";

const RANGE_FIRE = 15;
const RADIUS_MIN_RALLY = 4;

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
  range = { zones: new Set(), fire: new Set(), front: new Set() };

  constructor(cell) {
    super(cell);

    this.r = 1;
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

            if (cell.isPlot) {
              this.ground.add(cell);
              this.border.add(cell);
            }

            this.cells.add(cell);
            cell.zone = this;
          }

          for (const neighbor of cell.neighbors) {
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

function isSurroundedBySameZoneGround(ground, cell) {
  if (cell.neighbors.length < 8) return false;

  for (const neighbor of cell.neighbors) {
    if (!ground.has(neighbor)) return false;
  }

  return true;
}

export function createZones() {
  const free = new Set([...Board.ground].filter(cell => (!cell.zone && cell.isPlot)));
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
      for (const neighbor of cell.neighbors) {
        if (!neighbor.zone && neighbor.isPlot) {
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
  for (const zone of zones) {
    identifyNeighborsOfZone(zone);
  }
}

function identifyNeighborsOfZone(zone) {
  const traversed = new Set();
  let wave = new Set(zone.border);

  zone.neighbors.clear();

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      for (const neighbor of cell.neighbors) {
        if (!neighbor.isPath) continue;
        if (traversed.has(neighbor)) continue;

        if (neighbor.zone === zone) {
          next.add(neighbor);
        } else {
          zone.neighbors.add(neighbor.zone);
          neighbor.zone.neighbors.add(zone);
        }

        traversed.add(neighbor);
      }
    }

    wave = next;
  }
}

function identifyRanges() {
  for (const zone of zones) {
    identifyRangesInRay(zone, zone, (zone.r + RANGE_FIRE) * (zone.r + RANGE_FIRE), new Set());
  }
}

function identifyRangesInRay(zone, ray, squareFireRange, exclude) {
  const squareDistance = (zone.x - ray.x) * (zone.x - ray.x) + (zone.y - ray.y) * (zone.y - ray.y);

  zone.range.zones.add(ray);
  exclude.add(ray);

  if ((squareDistance < squareFireRange) || (ray.r < RADIUS_MIN_RALLY)) {
    zone.range.fire.add(ray);

    for (const next of ray.neighbors) {
      if (!exclude.has(next)) {
        identifyRangesInRay(zone, next, squareFireRange, exclude);
      }
    }
  } else {
    zone.range.front.add(ray);
  }
}
