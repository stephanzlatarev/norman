import { Base, Depot, Memory } from "./imports.js";

let areThereMoreExpansionLocations = true;

export default function() {
  if (!areThereMoreExpansionLocations) {
    // There are no more expansion locations
    Base.expo = null;
  } else if (Memory.DeploymentOutreach < Memory.DeploymentOutreachExpandDefense) {
    // We don't want to expand at this moment
    Base.expo = null;
  } else if (!Base.expo || Base.expo.depot) {
    Base.expo = findNextExpo();

    if (Base.expo) {
      console.log("Next expansion location is", Base.expo.name);
    } else {
      console.log("There are no more expansion locations!");
      areThereMoreExpansionLocations = false;
    }
  }
}

function findNextExpo() {
  const depots = Depot.list().filter(depot => !depot.depot);

  let bestDistance = Infinity;
  let expo = null;

  for (const depot of depots) {
    let distance = 0;

    for (const base of Base.list()) {
      distance += findShortestDistance(base, depot);
    }

    if (distance < bestDistance) {
      bestDistance = distance;
      expo = depot;
    }
  }

  return expo;
}

function findShortestDistance(base, zone) {
  let shortest = Infinity;

  for (const corner of base.corners) {
    const distance = corner.distanceTo(zone);

    if (distance < shortest) {
      shortest = distance;
    }
  }

  return shortest;
}
