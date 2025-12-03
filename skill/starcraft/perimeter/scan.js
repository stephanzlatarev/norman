import { Zone } from "./imports.js";

const PERIMETER_BLUE = 1;    // The zone is within the defendable perimeter
const PERIMETER_WHITE = 3;   // The zone is outside our perimeter
const PERIMETER_RED = 5;     // The zone is within enemy perimeter

class Scan {

  inner = { zones: new Set(), depots: new Set(), production: new Set() };
  enemy = { zones: new Set(), depots: new Set(), production: new Set() };
  outer = { zones: new Set() };

  scan() {
    let changed = false;

    for (const zone of Zone.list()) {
      if (zone.isDepot) {
        if (zone.buildings.size) {
          if (!this.inner.depots.has(zone)) changed = true;
          this.inner.depots.add(zone);
        } else if (hasEnemyBuildings(zone)) {
          if (!this.enemy.depots.has(zone)) changed = true;
          this.enemy.depots.add(zone);
        }
      } else if (zone.isHall) {
        if (zone.buildings.size) {
          if (!this.inner.production.has(zone)) changed = true;
          this.inner.production.add(zone);
        } else if (hasEnemyBuildings(zone)) {
          if (!this.enemy.production.has(zone)) changed = true;
          this.enemy.production.add(zone);
        }
      }

      if (zone.perimeterLevel >= PERIMETER_RED) {
        this.enemy.zones.add(zone);
      } else if (zone.perimeterLevel >= PERIMETER_WHITE) {
        this.outer.zones.add(zone);
      } else if (zone.perimeterLevel >= PERIMETER_BLUE) {
        this.inner.zones.add(zone);
      } else if (zone.perimeterLevel) {
        zone.perimeterLevel = undefined;
      }
    }

    return changed;
  }

}

function hasEnemyBuildings(zone) {
  for (const sector of zone.sectors) {
    for (const unit of sector.threats) {
      if (unit.zone !== zone) continue;

      // TODO: Exclude offensive unit types like photon cannons and bunkers
      if (unit.type.isBuilding) {
        return true;
      }
    }
  }
}

export default new Scan();
