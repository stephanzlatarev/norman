import { Zone } from "./imports.js";

const PERIMETER_BLUE = 1;    // The zone is within the defendable perimeter
const PERIMETER_WHITE = 3;   // The zone is outside our perimeter
const PERIMETER_RED = 5;     // The zone is within enemy perimeter

class Scan {

  inner = { zones: new Set(), depots: new Set(), production: new Set() };
  enemy = { zones: new Set(), depots: new Set(), production: new Set() };
  outer = { zones: new Set() };

  scan() {
    const scan = {
      inner: { zones: new Set(), depots: new Set(), production: new Set() },
      enemy: { zones: new Set(), depots: new Set(), production: new Set() },
      outer: { zones: new Set() },
    };

    for (const zone of Zone.list()) {
      if (!zone.isDepot && !zone.isHall) continue;

      if (zone.isDepot) {
        if (zone.buildings.size) {
          scan.inner.depots.add(zone);
        } else if (hasEnemyBuildings(zone)) {
          scan.enemy.depots.add(zone);
        }
      } else if (zone.isHall) {
        if (zone.buildings.size) {
          scan.inner.production.add(zone);
        } else if (hasEnemyBuildings(zone)) {
          scan.enemy.production.add(zone);
        }
      }

      if (zone.perimeterLevel >= PERIMETER_RED) {
        scan.enemy.zones.add(zone);
      } else if (zone.perimeterLevel >= PERIMETER_WHITE) {
        scan.outer.zones.add(zone);
      } else if (zone.perimeterLevel >= PERIMETER_BLUE) {
        scan.inner.zones.add(zone);
      } else if (zone.perimeterLevel) {
        zone.perimeterLevel = undefined;
      }
    }

    if (hasScanChanged(this, scan)) {
      this.inner = scan.inner;
      this.enemy = scan.enemy;
      this.outer = scan.outer;

      return true;
    }
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

function hasScanChanged(a, b) {
  if (hasSetChanged(a.inner.zones, b.inner.zones)) return true;
  if (hasSetChanged(a.inner.depots, b.inner.depots)) return true;
  if (hasSetChanged(a.inner.production, b.inner.production)) return true;
  if (hasSetChanged(a.enemy.zones, b.enemy.zones)) return true;
  if (hasSetChanged(a.enemy.depots, b.enemy.depots)) return true;
  if (hasSetChanged(a.enemy.production, b.enemy.production)) return true;
  if (hasSetChanged(a.outer.zones, b.outer.zones)) return true;
}

function hasSetChanged(a, b) {
  return (a.size !== b.size) || ([...a, ...b].size !== a.size);
}

export default new Scan();
