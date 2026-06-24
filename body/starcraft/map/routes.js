import Depot from "./depot.js";
import Zone from "./zone.js";

export function routeZones() {
  if (!Depot.home) return;

  for (const zone of Zone.list()) {
    zone.route.length = 0;
    zone.distance = 0;
  }

  Depot.home.route.push(Depot.home);
  Depot.home.distance = 0;

  traverse(new Set([Depot.home]), new Set());
  complete();
}

function traverse(wave, traversed) {
  const next = new Set();

  for (const zone of wave) {
    traversed.add(zone);
  }

  for (const zone of wave) {
    if (!zone.isGroundPassable) continue;

    for (const [neighbor, corridor] of zone.exits) {
      if (!corridor.isGroundPassable) continue;
      if (traversed.has(neighbor)) continue;

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
    traverse(next, traversed);
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
  const distance = a.distance + Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));

  if (!b.distance || (distance < b.distance)) {
    b.distance = distance;
    b.route = [b, ...a.route];
  }
}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
