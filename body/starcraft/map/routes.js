import Depot from "./depot.js";
import Zone from "./zone.js";

export function routeZones() {
  if (!Depot.home) return;

  for (const zone of Zone.list()) {
    zone.route.length = 0;
    zone.distance = 0;
    zone.offset = 0;
  }

  Depot.home.route.push(Depot.home);
  Depot.home.distance = 0;
  Depot.home.offset = 0;

  traverse(new Set([Depot.home]));
  complete();
}

function traverse(wave) {
  const next = new Set();

  for (const zone of wave) {
    if (!zone.isGroundPassable) continue;

    for (const [neighbor, corridor] of zone.exits) {
      // Avoid obstacles
      if (!corridor.isGroundPassable) continue;

      // Prevent cycles
      if (zone.route.some(one => (one === neighbor))) continue;

      // Ignore longer paths
      if (neighbor.distance && (reach(neighbor) < reach(zone))) continue;

      if (corridor.via) {
        setRoute(zone, corridor.via);
        setRoute(corridor.via, neighbor);
      } else {
        setRoute(zone, neighbor);
      }

      next.add(neighbor);
    }
  }

  if (next.size) {
    traverse(next);
  }
}

function complete() {
  for (const zone of Zone.list()) {
    if (zone.route.length) continue;

    for (const [neighbor, corridor] of zone.exits) {
      if (!neighbor.route.length) continue;
      if (corridor.via && (corridor.via !== zone)) continue;
      if (!corridor.via && !corridor.isGroundPassable) continue;

      setRoute(neighbor, zone);
    }
  }
}

function setRoute(a, b) {
  const leg = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
  const distance = a.distance + leg;
  const offset = b.depot ? 0 : a.offset + leg;

  if (!b.route.length || (reach({ distance, offset }) < reach(b))) {
    b.distance = distance;
    b.offset = offset;
    b.route = [b, ...a.route];
  }
}

// Give weight to distance from home base and nearest base
function reach({ distance, offset }) {
  return distance + offset;
}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
