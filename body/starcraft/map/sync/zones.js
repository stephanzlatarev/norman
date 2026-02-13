import Depot from "../depot.js";
import Zone from "../zone.js";

export function syncZones() {
  const zones = Zone.list();

  let previousLevel = 0;
  let needsSorting = false;

  for (const zone of zones) {
    const level = (zone.perimeterLevel >= 0) ? zone.perimeterLevel : Infinity;

    if (level < previousLevel) {
      needsSorting = true;
      break;
    }

    previousLevel = level;
  }

  if (needsSorting) {
    Zone.order();
    Depot.order();
  }
}
