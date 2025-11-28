import { PERIMETER_BLUE, PERIMETER_GREEN, PERIMETER_WHITE, PERIMETER_YELLOW, PERIMETER_RED } from "../map/perimeter.js";
import Zone from "../map/zone.js";

let show = false;

export default function(shapes) {
  if (!show) return;

  for (const zone of Zone.list()) {
    const color = getColor(zone);
    const radius = getRadius(zone);

    shapes.push({ shape: "circle", x: zone.x, y: zone.y, r: radius, color: color });
  }
}

function getColor(zone) {
  let color = "black";

  if (zone.perimeterLevel >= PERIMETER_RED) {
    color = "red";
  } else if (zone.perimeterLevel >= PERIMETER_YELLOW) {
    color = "yellow";
  } else if (zone.perimeterLevel >= PERIMETER_WHITE) {
    color = "white";
  } else if (zone.perimeterLevel >= PERIMETER_GREEN) {
    color = "green";
  } else if (zone.perimeterLevel >= PERIMETER_BLUE) {
    color = "blue";
  }

  return color;
}

function getRadius(zone) {
  if (zone.isDepot) return 10;
  if (zone.isHall) return 5;
  return 2;
}
