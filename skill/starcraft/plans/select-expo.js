import { Depot, Limit, Memory, TotalCount } from "./imports.js";

export default function() {
  if (shouldFindNextExpansionLocation()) {
    const pin = findNextExpansionLocation();

    setNextExpansionLocationPin(pin);

    if (pin) {
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

  let bestDistance = Infinity;
  let expo = null;

  for (const depot of depots) {
    const groundDistance = depot.distance.get(Depot.home);
    const airDistance = calculateDistance(depot, Depot.home);
    const distance = groundDistance + groundDistance + airDistance;

    if (distance < bestDistance) {
      bestDistance = distance;
      expo = depot;
    }
  }

  return expo;
}

function calculateDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}
