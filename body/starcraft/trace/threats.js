import Zone from "../map/zone.js";

const color = { r: 200, g: 0, b: 0 };

export default function(spheres) {
  for (const zone of Zone.list()) {
    for (const threat of zone.threats) {
      if (!zone.enemies.has(threat)) {
        spheres.push({ p: { x: threat.body.x, y: threat.body.y, z: 0 }, r: threat.body.r + 0.3, color });
      }
    }
  }
}
