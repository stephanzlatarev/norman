import Pin from "./pin.js";

const zones = [];
const knownThreats = new Map();

export default class Zone extends Pin {

  buildings = new Set();
  warriors = new Set();
  enemies = new Set();
  threats = new Set();

  constructor(x, y, r) {
    super({ x, y });

    this.r = (r > 0) ? r : 1;
    this.corridors = [];
    this.cells = new Set();

    zones.push(this);
  }

  addUnit(unit) {
    if (this === unit.zone) return;

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
    } else if (unit.type.isWarrior && !unit.type.isWorker) {
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

      for (const cell of old.cells) {
        this.cells.add(cell);
        cell.zone = this;
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

  constructor(x, y, r) {
    super(x, y, r);

    this.zones = [];
  }

}

export function createZones(board) {
  const mapping = new Map();
  const zones = [];

  for (const area of board.areas) {
    const zone = area.zone ? area.zone : new Zone(area.x, area.y, area.level);

    for (const cell of area.cells) {
      zone.cells.add(cell);
      cell.zone = zone;
    }

    zones.push(zone);
    mapping.set(area, zone);
  }

  for (const join of board.joins) {
    const corridor = new Corridor(join.x, join.y, join.margin);

    for (const cell of join.cells) {
      corridor.cells.add(cell);
      cell.zone = corridor;
    }

    for (const area of join.areas) {
      const zone = mapping.get(area);

      zone.corridors.push(corridor);
      corridor.zones.push(zone);
    }
  }

  labelZones(zones);
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
