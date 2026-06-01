import Depot from "../depot.js";

export function routeZones() {
  if (!Depot.home) return;

  Depot.home.route.push(Depot.home);
  Depot.home.distance = 0;

  traverse(new Set([Depot.home]), new Set());
}

function traverse(wave, traversed) {
  const next = new Set();

  for (const zone of wave) {
    traversed.add(zone);
  }

  for (const zone of wave) {
    for (const [neighbor, corridor] of zone.exits) {
      if (traversed.has(neighbor)) continue;

      if (corridor.via === neighbor) {
        setRoute(zone, neighbor);
        next.add(neighbor);
      } else if (corridor.via.isPassage) {
        setRoute(zone, corridor.via);
        setRoute(corridor.via, neighbor);
        next.add(neighbor);
      } else {
        setRoute(zone, corridor.via);
      }
    }
  }

  if (next.size) {
    traverse(next, traversed);
  }
}

function setRoute(a, b) {
  const distance = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));

  if (!b.distance || (a.distance + distance < b.distance)) {
    b.distance = a.distance + distance;
    b.route = [b, ...a.route];
  }
}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
