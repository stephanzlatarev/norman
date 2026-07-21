import Depot from "./depot.js";
import Zone from "./zone.js";

export const PERIMETER_BLUE = 1;    // The zone is within the defendable perimeter
export const PERIMETER_GREEN = 2;   // The zone is within our perimeter
export const PERIMETER_WHITE = 3;   // The zone is outside our perimeter
export const PERIMETER_YELLOW = 4;  // The zone is with enemy presence
export const PERIMETER_RED = 5;     // The zone is within enemy perimeter
export const PERIMETER_BLACK = 6;   // The zone is unreachable

const STEP = 0.01;

export function mapPerimeters() {
  if (!Depot.home) return;

  const zones = [...Zone.list()].sort((a, b) => (a.distance - b.distance));

  let innerLevel = PERIMETER_BLUE + STEP;
  let outerLevel = PERIMETER_WHITE + STEP;
  let enemyLevel = PERIMETER_YELLOW + STEP;

  let isOutsidePerimeter = false;
  let isInEnemyPerimeter = false;

  for (const zone of zones) {
    if (zone === Depot.home) {
      zone.perimeterLevel = PERIMETER_BLUE + STEP;
      innerLevel = PERIMETER_BLUE + STEP;
    } else if (!zone.route.length) {
      zone.perimeterLevel = Infinity;
    } else if (zone.isDepot) {
      if (zone.buildings.size) {
        zone.perimeterLevel = innerLevel;
        innerLevel += STEP;
      } else if (isInEnemyPerimeter || hasEnemyBuildings(zone)) {
        if (enemyLevel < PERIMETER_RED) enemyLevel = PERIMETER_RED + STEP;

        zone.perimeterLevel = enemyLevel;
        enemyLevel += STEP;
        isInEnemyPerimeter = true;
      } else {
        zone.perimeterLevel = outerLevel;
        outerLevel += STEP;
        isOutsidePerimeter = true;
      }

      if (!zone.buildings.size && (innerLevel < PERIMETER_GREEN)) {
        innerLevel = PERIMETER_GREEN + STEP;
      }
    } else if (zone.isHall) {
      if (zone.buildings.size) {
        zone.perimeterLevel = innerLevel;
        innerLevel += STEP;
      } else if (isInEnemyPerimeter || hasEnemyBuildings(zone)) {
        zone.perimeterLevel = enemyLevel;
        enemyLevel += STEP;
        isInEnemyPerimeter = true;
      } else {
        zone.perimeterLevel = outerLevel;
        outerLevel += STEP;
        isOutsidePerimeter = true;
      }

      if (!zone.buildings.size && (innerLevel < PERIMETER_GREEN)) {
        innerLevel = PERIMETER_GREEN + STEP;
      }
    } else if (isInEnemyPerimeter) {
      zone.perimeterLevel = enemyLevel;
      enemyLevel += STEP;
    } else if (isOutsidePerimeter) {
      zone.perimeterLevel = outerLevel;
      outerLevel += STEP;
    } else {
      zone.perimeterLevel = innerLevel;
      innerLevel += STEP;
    }
  }
}

function hasEnemyBuildings(zone) {
  for (const sector of zone.sectors) {
    for (const unit of sector.contacts) {
      if (unit.zone !== zone) continue;

      // TODO: Exclude offensive unit types like photon cannons and bunkers
      if (unit.type.isBuilding) {
        return true;
      }
    }
  }
}
