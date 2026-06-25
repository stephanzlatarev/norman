import Depot from "../depot.js";
import Zone from "../zone.js";

export function syncZones() {
  const zones = Zone.list();

  let previousLevel = 0;
  let needsSorting = false;

  for (const zone of zones) {
    if (zone.perimeterLevel < previousLevel) {
      needsSorting = true;
      break;
    }

    previousLevel = zone.perimeterLevel;
  }

  if (needsSorting) {
    Zone.order();
    Depot.order();
  }
}
