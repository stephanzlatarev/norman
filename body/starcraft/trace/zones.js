import { ALERT_WHITE, ALERT_YELLOW } from "../map/alert.js";
import Zone from "../map/zone.js";

const COLORS = [null, "blue", "green", null, "yellow", "red"];

export default function(shapes) {
  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    const color = COLORS[Math.floor(zone.alertLevel)];
    if (!color) continue;

    const filled = true;
    const pulsing = (zone.alertLevel >= ALERT_YELLOW);

    let r;
    if (zone.alertLevel === ALERT_WHITE) {
      r = zone.isDepot ? 3.5 : 1.2;
    } else {
      r = zone.isDepot ? 10 : 5;
    }

    shapes.push({ shape: "circle", x: zone.x, y: zone.y, r, color, pulsing, filled });
  }
}
