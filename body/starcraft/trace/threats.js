import Sector from "../map/sector.js";

export default function(shapes) {
  for (const sector of Sector.list()) {
    for (const contact of sector.contacts) {
      if (!sector.enemies.has(contact)) {
        shapes.push({ shape: "circle", x: contact.body.x, y: contact.body.y, r: contact.body.r + 0.3, color: "black", filled: true });
      }
    }
    for (const threat of sector.threats) {
      if (!sector.enemies.has(threat)) {
        shapes.push({ shape: "circle", x: threat.body.x, y: threat.body.y, r: threat.body.r + 0.3, color: "red", filled: true });
      }
    }
  }
}
