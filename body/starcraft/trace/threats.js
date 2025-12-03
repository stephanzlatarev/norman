import Sector from "../map/sector.js";

const color = { r: 200, g: 0, b: 0 };

export default function(spheres) {
  for (const sector of Sector.list()) {
    for (const threat of sector.threats) {
      if (!sector.enemies.has(threat)) {
        spheres.push({ p: { x: threat.body.x, y: threat.body.y, z: 0 }, r: threat.body.r + 0.3, color });
      }
    }
  }
}
