import { Depot, Limit, Memory, TotalCount } from "./imports.js";

const PERIMETER_RED = 5;     // The zone is within enemy perimeter

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

    if (!expo || (depot.perimeterLevel < expo.perimeterLevel)) {
      expo = depot;
    }
  }

  return expo;
}
