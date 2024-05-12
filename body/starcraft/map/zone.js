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

    if (unit.isEnemy) {
      if (unit.zone) {
        unit.zone.enemies.delete(unit);
        unit.zone.threats.delete(unit);
      } else {
        const previous = knownThreats.get(unit.tag);

        if (previous && previous.zone) {
          previous.zone.enemies.delete(previous);
          previous.zone.threats.delete(previous);
        }

        knownThreats.set(unit.tag, unit);
      }

      this.enemies.add(unit);
      this.threats.add(unit);
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

    if (unit.isEnemy) {
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

  for (const area of board.areas) {
    const zone = area.zone ? area.zone : new Zone(area.center.x, area.center.y, area.center.margin);

    for (const cell of area.cells) {
      zone.cells.add(cell);
      cell.zone = zone;
    }

    for (const cell of area.ramps) {
      zone.cells.add(cell);
      cell.zone = zone;
    }

    mapping.set(area, zone);
  }

  for (const join of board.joins) {
    const corridor = new Corridor(join.center.x, join.center.y, join.center.margin);

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
}
