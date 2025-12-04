import { Memory, Zone } from "./imports.js";
import Scan from "./scan.js";
import listEnemyZones from "./list-enemy-zones.js";
import listInnerZones from "./list-inner-zones.js";
import listOuterZones from "./list-outer-zones.js";

const PERIMETER_BLUE = 1;    // The zone is within the defendable perimeter
const PERIMETER_WHITE = 3;   // The zone is outside our perimeter
const PERIMETER_RED = 5;     // The zone is within enemy perimeter

export default function() {
  if (!Scan.scan()) return;

  const perimeter = new Set();

  const inner = listInnerZones();
  for (const zone of inner) perimeter.add(zone);

  const enemy = listEnemyZones(perimeter);
  for (const zone of enemy) perimeter.add(zone);

  const outer = listOuterZones(inner, enemy);
  for (const zone of outer) perimeter.add(zone);

  setPerimeterLevels(inner, PERIMETER_BLUE);
  setPerimeterLevels(outer, PERIMETER_WHITE);
  setPerimeterLevels(enemy, PERIMETER_RED);

  // Ensure perimeter levels for the corridors in the perimeter
  for (const zone of perimeter) {
    if (!zone.isDepot && !zone.isHall) continue;

    for (const [neighbor, corridor] of zone.exits) {
      if (corridor.via === zone) continue;
      if (corridor.via === neighbor) continue;
      if (!perimeter.has(neighbor)) continue;

      corridor.via.perimeterLevel = Math.max(zone.perimeterLevel, neighbor.perimeterLevel);

      perimeter.add(corridor.via);
    }
  }

  // Clear perimeter levels outside inner, outer and enemy perimeters
  for (const zone of Zone.list()) {
    if (!perimeter.has(zone)) {
      zone.perimeterLevel = undefined;
    }
  }

  Memory.PerimeterLoop = Memory.loop;
}

function setPerimeterLevels(list, level) {
  const step = list.length ? 1 / list.length : 0;

  for (const zone of list) {
    zone.perimeterLevel = level;
    level += step;
  }
}
