import Pin from "./pin.js";

const FIRE_RANGE = 15;
const FRONT_RANGE = 10;

const zones = [];
const knownThreats = new Map();

export default class Zone extends Pin {

  hops = new Map();
  neighbors = new Set();
  range = { zones: new Set(), fire: new Set(), front: new Set(), back: new Set() };

  workers = new Set();
  buildings = new Set();
  warriors = new Set();
  enemies = new Set();
  threats = new Set();

  constructor(cell, r) {
    super(cell);

    this.r = (r > 0) ? r : 1;
    this.corridors = [];
    this.cells = new Set();

    zones.push(this);
  }

  getHopsTo(zone) {
    if (zone === this) return { distance: 0 };

    let hops = this.hops.get(zone);

    if (!hops) {
      calculateAllHopsFromZone(this);

      hops = this.hops.get(zone);
    }

    if (!hops) console.log("Ooops! No hops from", this.name, "to", zone.name);

    return hops;
  }

  addUnit(unit) {
    if (this === unit.zone) return;
    if (unit.isEnemy && !unit.isVisible) return;

    if (unit.isHallucination) {
      // Ignore the unit
    } else if (unit.isEnemy) {
      const previous = knownThreats.get(unit.tag);

      if (previous && previous.zone) {
        previous.zone.enemies.delete(previous);
        previous.zone.threats.delete(previous);
      }

      if (unit.zone) {
        unit.zone.enemies.delete(unit);
        unit.zone.threats.delete(unit);
      }

      this.enemies.add(unit);
      this.threats.add(unit);

      knownThreats.set(unit.tag, unit);
    } else if (unit.type.isWorker) {
      if (unit.zone) unit.zone.workers.delete(unit);

      this.workers.add(unit);
    } else if (unit.type.isWarrior) {
      if (unit.zone) unit.zone.warriors.delete(unit);

      this.warriors.add(unit);
    } else if (unit.type.isBuilding) {
      if (unit.zone) unit.zone.buildings.delete(unit);

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

  replace(old) {
    if (this.isCorridor && old.isCorridor) {
      for (const zone of old.zones) {
        for (let i = 0; i < zone.corridors.length; i++) {
          if (zone.corridors[i] === old) {
            zone.corridors[i] = this;
          }
        }
      }

      this.name = old.name;
      this.tier = old.tier;
      this.zones = [...old.zones];
      this.distance = old.distance;

      for (const cell of old.cells) {
        this.cells.add(cell);
        cell.zone = this;
      }

      for (const zone of Zone.list()) {
        if (zone.hops.has(old)) zone.hops.set(this, zone.hops.get(old));
        replaceInSet(zone.neighbors, old, this);
        replaceInSet(zone.range.zones, old, this);
        replaceInSet(zone.range.fire, old, this);
        replaceInSet(zone.range.front, old, this);
        replaceInSet(zone.range.back, old, this);
      }

      const updatedTiers = new Set();
      for (const zone of this.zones) {
        if (!updatedTiers.has(zone.tier)) {
          replaceInSet(zone.tier.fore, old, this);
          replaceInSet(zone.tier.zones, old, this);
          replaceInSet(zone.tier.back, old, this);
          updatedTiers.add(zone.tier);
        }
      }

      old.remove();
    } else {
      console.log("Only replacement of a corridor with another corridor is supported!");
      console.log(this, "vs", old);
    }
  }

  remove() {
    const index = zones.indexOf(this);

    if (index >= 0) {
      zones.splice(index, 1);
    }
  }

  static list() {
    return zones;
  }

}

export class Corridor extends Zone {

  isCorridor = true;
  distance = 0;

  constructor(cell, r) {
    super(cell, r);

    this.zones = [];
  }

}

export function createZones(board) {
  const mapping = new Map();
  const zones = [];

  for (const area of board.areas) {
    const zone = area.zone ? area.zone : new Zone(area.cell, area.level);

    for (const cell of area.cells) {
      zone.cells.add(cell);
      cell.zone = zone;
    }

    zones.push(zone);
    mapping.set(area, zone);
  }

  for (const join of board.joins) {
    const corridor = new Corridor(join.cell, join.level);

    for (const cell of join.cells) {
      corridor.cells.add(cell);
      cell.zone = corridor;
    }

    for (const area of join.areas) {
      const zone = mapping.get(area);

      zone.corridors.push(corridor);
      corridor.zones.push(zone);
    }

    corridor.distance = calculateDistance(...corridor.zones);
  }

  addRemainingCellsToZones(board, zones);

  labelZones(zones);
  identifyNeighbors();
  identifyRanges();
}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

function labelZones(zones) {
  let left = Infinity;
  let right = 0;
  let top = Infinity;
  let bottom = 0;

  for (const zone of zones) {
    left = Math.min(left, zone.x);
    right = Math.max(right, zone.x);
    top = Math.min(top, zone.y);
    bottom = Math.max(bottom, zone.y);
  }
  right++;
  bottom++;

  const colspan = (right - left) / 10;
  const rowspan = (bottom - top) / 10;

  for (const zone of zones) {
    if (zone.isCorridor) continue;

    const col = Math.floor((zone.x - left) / colspan);
    const row = Math.floor((zone.y - top) / rowspan);
    const type = zone.isDepot ? "#" : "*"

    zone.name = LETTERS[col] + row + type;

    for (const corridor of zone.corridors) {
      if (corridor.name) continue;

      const neighbor = (corridor.zones[0] === zone) ? corridor.zones[1] : corridor.zones[0];
      const neighborCol = Math.floor((neighbor.x - left) / colspan);
      const neighborRow = Math.floor((neighbor.y - top) / rowspan);

      if (neighborCol < col) continue;
      if ((neighborCol === col) && (neighborRow < row)) continue;

      if (neighborCol === col) {
        corridor.name = LETTERS[col] + row + "|";
      } else if (neighborRow < row) {
        corridor.name = LETTERS[col] + row + "\\";
      } else if (neighborRow > row) {
        corridor.name = LETTERS[col] + row + "/";
      } else {
        corridor.name = LETTERS[col] + row + "-";
      }
    }
  }
}

function identifyNeighbors() {
  for (const zone of zones) {
    if (zone.corridors) {
      for (const corridor of zone.corridors) {
        zone.neighbors.add(corridor);

        for (const neighbor of corridor.zones) {
          if (neighbor !== zone) zone.neighbors.add(neighbor);
        }
      }
    } else if (zone.zones) {
      for (const neighbor of zone.zones) {
        zone.neighbors.add(neighbor);
      }
    }
  }
}

function identifyRanges() {
  for (const zone of zones) {
    identifyRangesInRay(zone, zone, true, new Set());
  }
}

function identifyRangesInRay(zone, ray, isInFireRange, skip) {
  const squareDistance = (zone.x - ray.x) * (zone.x - ray.x) + (zone.y - ray.y) * (zone.y - ray.y);
  let nextIsInFireRange = isInFireRange;

  zone.range.zones.add(ray);
  skip.add(ray);

  if (isInFireRange) {
    const squareFireRange = (zone.r + FIRE_RANGE) * (zone.r + FIRE_RANGE);

    if (squareDistance < squareFireRange) {
      zone.range.fire.add(ray);
    } else {
      zone.range.front.add(ray);
      nextIsInFireRange = false;
    }
  } else {
    const squareFrontRange = (zone.r + FIRE_RANGE + FRONT_RANGE) * (zone.r + FIRE_RANGE + FRONT_RANGE);

    if (squareDistance < squareFrontRange) {
      zone.range.front.add(ray);
    } else {
      zone.range.back.add(ray);
      return;
    }
  }

  for (const next of ray.neighbors) {
    if (next.cells.size && !skip.has(next)) {
      identifyRangesInRay(zone, next, nextIsInFireRange, skip);
    }
  }
}

function calculateAllHopsFromZone(zone) {
  const directions = new Map();
  let wave = new Set();
  let traversed = new Set([zone]);
  let distance = 1;

  for (const corridor of zone.corridors) {
    for (const neighbor of corridor.zones) {
      if (neighbor !== zone) {
        wave.add(neighbor);
        traversed.add(neighbor);
        directions.set(neighbor, corridor);
      }
    }
  }

  while (wave.size) {
    const next = new Set();

    for (const one of wave) {
      const direction = directions.get(one);

      zone.hops.set(one, { direction: direction, distance: distance });

      for (const neighbor of one.neighbors) {
        if (!neighbor.isCorridor && !traversed.has(neighbor)) {
          directions.set(neighbor, direction);
          next.add(neighbor);
          traversed.add(neighbor);
        }
      }
    }

    wave = next;
    distance++;
  }
}

function replaceInSet(set, previous, current) {
  if (set.has(previous)) {
    set.delete(previous);
    set.add(current);
  }
}

function addRemainingCellsToZones(board, zones) {
  const expandingZones = [...zones].filter(zone => (zone.cells.size > 0));

  for (const row of board.cells) {
    for (const cell of row) {
      if (!cell.zone) {
        addCellToClosestZone(cell, expandingZones);
      }
    }
  }
}

function addCellToClosestZone(cell, zones) {
  let closestZone;
  let closestDistance = Infinity;

  for (const zone of zones) {
    const distance = Math.abs(zone.x - cell.x) + Math.abs(zone.y - cell.y);

    if (distance < closestDistance) {
      closestZone = zone;
      closestDistance = distance;
    }
  }

  if (closestZone) {
    cell.zone = closestZone;
    closestZone.cells.add(cell);
  }
}
