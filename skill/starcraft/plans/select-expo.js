import { Depot, Limit, Memory, TotalCount, Units } from "./imports.js";

const PERIMETER_RED = 5;     // The zone is within enemy perimeter
const DEPOT_BUILDING_HALF_SIZE = 5 / 2;

let expansionSelectionLoop;

export default function() {
  if (shouldFindNextExpansionLocation()) {
    const pin = findNextExpansionLocation();

    setNextExpansionLocationPin(pin);

    if (pin) {
      expansionSelectionLoop = Memory.Loop;

      console.log("Next expansion location is", pin.toString());
    }
  }
}

function setNextExpansionLocationPin(pin) {
  Memory.PinNextExpansionX = pin?.x;
  Memory.PinNextExpansionY = pin?.y;
}

function shouldFindNextExpansionLocation() {
  // Check if there are more expansion locations
  if (TotalCount.Nexus >= Depot.list().length) return false;

  // Check if we want to expand at this moment
  if (TotalCount.Nexus >= Limit.Nexus) return false;

  // Check if perimeter changed since last time
  if (Memory.PerimeterLoop > expansionSelectionLoop) return true;

  const pinx = Memory.PinNextExpansionX;
  const piny = Memory.PinNextExpansionY;

  // Check if there's no pin
  if (!pinx || !piny) return true;

  for (const depot of Depot.list()) {
    if ((depot.x === pinx) && (depot.y === piny)) {
      // If the pin points to a depot, check if it's occupied
      return !!depot.depot;
    }
  }

  // Otherwise, we need to find a new pin
  return true;
}

function findNextExpansionLocation() {
  const depots = Depot.list().filter(depot => !depot.depot);

  let expo = null;

  for (const depot of depots) {
    if (depot.perimeterLevel >= PERIMETER_RED) continue;
    if (isDepotBlockedByObstacle(depot)) continue;

    if (!expo || (depot.perimeterLevel < expo.perimeterLevel)) {
      expo = depot;
    }
  }

  return expo;
}

function isDepotBlockedByObstacle(depot) {
  for (const obstacle of Units.obstacles().values()) {
    const { x, y, r } = obstacle.body;
    const closestX = Math.max(depot.x - DEPOT_BUILDING_HALF_SIZE, Math.min(x, depot.x + DEPOT_BUILDING_HALF_SIZE));
    const closestY = Math.max(depot.y - DEPOT_BUILDING_HALF_SIZE, Math.min(y, depot.y + DEPOT_BUILDING_HALF_SIZE));
    const dx = x - closestX;
    const dy = y - closestY;

    if ((dx * dx + dy * dy) < (r * r)) return true;
  }
}
