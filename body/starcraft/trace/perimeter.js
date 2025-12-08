import { PERIMETER_BLUE, PERIMETER_GREEN, PERIMETER_WHITE, PERIMETER_YELLOW, PERIMETER_RED } from "../map/perimeter.js";
import Zone from "../map/zone.js";

export default function(shapes) {
  const sectors = new Set();

  for (const zone of Zone.list().sort((a, b) => ((b.perimeterLevel || 0) - (a.perimeterLevel || 0)))) {
    const color = getColor(zone);

    if (color) {
      for (const sector of zone.sectors) {
        if (!sectors.has(sector)) {
          shapes.push({ shape: "sector", row: sector.row, col: sector.col, color });
          sectors.add(sector);
        }
      }
    }
  }
}

function getColor(zone) {
  if (zone.perimeterLevel >= PERIMETER_RED) {
    return "red";
  } else if (zone.perimeterLevel >= PERIMETER_YELLOW) {
    return "yellow";
  } else if (zone.perimeterLevel >= PERIMETER_WHITE) {
    return null;
  } else if (zone.perimeterLevel >= PERIMETER_GREEN) {
    return "green";
  } else if (zone.perimeterLevel >= PERIMETER_BLUE) {
    return "blue";
  } else {
    return "black";
  }
}
