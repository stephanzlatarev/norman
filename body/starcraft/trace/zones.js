import { ALERT_BLUE, ALERT_GREEN, ALERT_WHITE, ALERT_YELLOW, ALERT_RED } from "../map/alert.js";
import Zone from "../map/zone.js";

let show = true;

const Color = {};
Color[ALERT_BLUE] = "blue";
Color[ALERT_GREEN] = "green";
Color[ALERT_WHITE] = "white";
Color[ALERT_YELLOW] = "yellow";
Color[ALERT_RED] = "red";
Color.Unknown = "gray";

export default function(shapes) {
  if (!show) return;

  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    const color = Color[zone.alertLevel] || Color.Unknown;

    let radius;
    if (zone.alertLevel === ALERT_WHITE) {
      radius = zone.isDepot ? 3.5 : 1.2;
    } else {
      radius = zone.isDepot ? 10 : 5;
    }

    shapes.push({ shape: "circle", x: zone.x, y: zone.y, r: radius, color });
  }
}
