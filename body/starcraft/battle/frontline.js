import { getOrbCells, isCellInOrb } from "./orbs.js";
import Position from "./position.js";
import GameMap from "../map/map.js";

const PILLAGE_RANGE = 4;

// This is frontline for assault battles. Harrass, pillage, defend, and contain battles may have different frontlines.
export default class Frontline {

  // The zones close enough to the battle to be monitored for threats
  zones;

  groundToGround = new Positions();
  groundToAir = new Positions();

  constructor(zone) {
    this.zone = zone;
    this.zones = getBattleZones(zone);
  }

  pillage(threats) {
    const targetsGround = new Set();
    const targetsAir = new Set();

    this.groundToGround.startAssessment();
    this.groundToAir.startAssessment();

    for (const threat of threats) {
      if (threat.zone === this.zone) {
        if (threat.body.isFlying) {
          targetsAir.add(threat);
        } else if (threat.body.isGround) {
          targetsGround.add(threat);
        }

        for (const cell of getOrbCells(threat.body, PILLAGE_RANGE)) {
          if (this.zones.has(cell.zone)) {
            if (threat.body.isFlying) {
              this.groundToAir.add(cell);
            } else if (threat.body.isGround) {
              this.groundToGround.add(cell);
            }
          }
        }
      }
    }

    this.groundToGround.completeAssessment(targetsGround);
    this.groundToAir.completeAssessment(targetsAir);
  }

  fight(threats, passives) {
    this.threats = threats;
    this.range = new Map();

    for (const zone of this.zones) {
      if (isCellInThreatsRange(GameMap.cell(zone.x, zone.y), threats, this.range)) {
        zone.canBeEntrance = false;
      }
    }

    const targetsGround = new Set();
    const targetsAir = new Set();
    const cellsGround = new Set();
    const cellsAir = new Set();

    this.groundToGround.startAssessment();
    this.groundToAir.startAssessment();

    for (const threat of threats) {
      if (threat.zone !== this.zone) continue;

      if (threat.body.isFlying) {
        targetsAir.add(threat);
      } else if (threat.body.isGround) {
        targetsGround.add(threat);
      }

      const orb = threat.type.damageGround ? threat.weapon.orbGround : PILLAGE_RANGE;

      for (const cell of getOrbCells(threat.body, orb)) {
        if (this.zones.has(cell.zone)) {
          if (threat.body.isFlying) {
            cellsAir.add(cell);
          } else if (threat.body.isGround) {
            cellsGround.add(cell);
          }
        }
      }
    }

    if (!cellsGround.size && !cellsAir.size) {
      for (const threat of passives) {
        for (const cell of getOrbCells(threat.body, PILLAGE_RANGE)) {
          if (this.zones.has(cell.zone)) {
            if (threat.body.isFlying) {
              cellsAir.add(cell);
            } else if (threat.body.isGround) {
              cellsGround.add(cell);
            }
          }
        }
      }
    }

    for (const cell of cellsGround) {
      if (!isCellInThreatsRange(cell, threats, this.range)) {
        this.groundToGround.add(cell, findEntrance(cell, threats, this.range));
      }
    }

    for (const cell of cellsAir) {
      if (!isCellInThreatsRange(cell, threats, this.range)) {
        this.groundToAir.add(cell, findEntrance(cell, threats, this.range));
      }
    }

    this.groundToGround.completeAssessment(targetsGround);
    this.groundToAir.completeAssessment(targetsAir);
  }

  isInBattleZone(warrior) {
    for (const zone of this.zones) {
      if (warrior.zone === zone) {
        return true;
      }
    }
  }

  isInThreatsRange(warrior) {
    return (warrior && warrior.cell && this.threats && this.range) ? isCellInThreatsRange(warrior.cell, this.threats, this.range) : false;
  }

}

class Positions {

  positions = new Set();
  cells = new Map();
  size = 0;

  [Symbol.iterator]() {
    return this.positions[Symbol.iterator]();
  };

  add(cell, entrance) {
    let position = this.cells.get(cell);

    if (!position) {
      position = new Position(cell, entrance);

      this.positions.add(position);
      this.cells.set(cell, position);
      this.size = this.positions.size;
    }

    if (entrance) {
      position.entrance = entrance;
    }

    position.isValid = true;

    return position;
  }

  delete(position) {
    this.positions.delete(position);
    this.cells.delete(position.cell);
    this.size = this.positions.size;
  }

  startAssessment() {
    for (const position of this.positions) {
      position.isValid = false;
    }
  }

  completeAssessment(threats) {
    for (const position of this.positions) {
      if (position.isValid) {
        position.assess(threats);
      } else {
        this.delete(position);
      }
    }
  }

}

function approximateDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getBattleZones(zone) {
  const zones = new Set();

  zones.add(zone);

  for (const corridor of zone.corridors) {
    for (const neighbor of corridor.zones) {
      zones.add(neighbor);
    }
  }

  return zones;
}

function findEntrance(cell, threats, cellsInThreatRange) {
  const zone = cell.zone;

  let bestEntrance;
  let bestDistance = Infinity;

  if (zone.entrance && !isCellInThreatsRange(GameMap.cell(zone.x, zone.y), threats, cellsInThreatRange)) {
    const distance = approximateDistance(cell, zone);

    if (distance < bestDistance) {
      bestEntrance = [zone, ...zone.entrance];
      bestDistance = distance;
    }
  }

  for (const corridor of cell.zone.corridors) {
    const neighbor = (cell.zone === corridor.zones[0]) ? corridor.zones[1] : corridor.zones[0];

    if (neighbor.entrance) {
      if (neighbor.entrance.length) {
        const neighborCorridor = neighbor.entrance[0];
  
        if (!isCellInThreatsRange(GameMap.cell(neighborCorridor.x, neighborCorridor.y), threats, cellsInThreatRange)) {
          const distance = approximateDistance(cell, neighborCorridor);

          if (distance < bestDistance) {
            bestEntrance = neighbor.entrance;
            bestDistance = distance;
          }
        }
      }

      if (!isCellInThreatsRange(GameMap.cell(neighbor.x, neighbor.y), threats, cellsInThreatRange)) {
        const distance = approximateDistance(cell, neighbor);

        if (distance < bestDistance) {
          bestEntrance = [neighbor, ...neighbor.entrance];
          bestDistance = distance;
        }
      }

      if (!neighbor.entrance.find(one => (corridor === one)) && !isCellInThreatsRange(GameMap.cell(corridor.x, corridor.y), threats, cellsInThreatRange)) {
        const distance = approximateDistance(cell, corridor);

        if (distance < bestDistance) {
          bestEntrance = [corridor, neighbor, ...neighbor.entrance];
          bestDistance = distance;
        }
      }
    }
  }

  return bestEntrance;
}

function isCellInThreatsRange(cell, threats, cellsInThreatRange) {
  if (!cell.isPath || cell.isObstacle) return true;

  const status = cellsInThreatRange.get(cell);

  if (status === true) return true;
  if (status === false) return false;

  for (const threat of threats) {
    if (!threat.type.damageGround) continue;

    if (isCellInOrb(threat.body, threat.weapon.orbGround, cell)) {
      cellsInThreatRange.set(cell, true);
      return true;
    }
  }

  cellsInThreatRange.set(cell, false);
  return false;
}
