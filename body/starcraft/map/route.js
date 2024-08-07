import { ALERT_WHITE } from "./alert.js";
import Zone from "./zone.js";

const path = new Map();
const hops = new Map();

export function createRoutes() {
  const zones = Zone.list();

  for (const zone of zones) {
    path.set(key(zone, zone), { corridor: null, zone: zone, distance: 0 });

    for (const corridor of zone.corridors) {
      for (const neighbor of corridor.zones) {
        corridor.distance = calculateDistance(zone, neighbor);

        path.set(key(zone, neighbor), { corridor: corridor, zone: zone, distance: corridor.distance });
      }
    }
  }
}

export function syncRoutes() {
  hops.clear();
}

export function getHopDistance(startCell, destinationCell) {
  const hop = getHop(startCell.zone, destinationCell.zone);

  return hop ? hop.distance : Infinity;
}

export function getHopZone(startCell, destinationCell) {
  const hop = getHop(startCell.zone, destinationCell.zone);

  if (hop && hop.corridor) {
    return isClose(startCell, hop.corridor) ? hop.zone : hop.corridor;
  }
}

function getHop(start, destination) {
  const direction = key(start, destination);

  return path.get(direction) || hops.get(direction) || findHop(start, destination);
}

function findHop(start, destination) {
  const done = new Set();
  let wave = new Set();

  wave.add(destination);

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
      const hopZoneToDestination = hops.get(key(zone, destination));

      // Check if the destination is reachable via this zone
      if (!hopZoneToDestination) continue;

      for (const corridor of zone.corridors) {
        for (const neighbor of corridor.zones) {
          if ((neighbor === zone) || done.has(neighbor)) continue;

          if (neighbor.alertLevel <= ALERT_WHITE) {
            next.add(neighbor);
          }

          const directionNeighborToDestination = key(neighbor, destination);
          const hopNeighborToDestination = path.get(directionNeighborToDestination) || hops.get(directionNeighborToDestination);
          const distance = hopZoneToDestination.distance + corridor.distance;

          if (!hopNeighborToDestination || (distance < hopNeighborToDestination.distance)) {
            hops.set(directionNeighborToDestination, { corridor: corridor, zone: zone, distance: distance });
          }
        }
      }

      done.add(zone);
    }

    wave = next;
  }

  return hops.get(key(start, destination));
}

function key(zoneA, zoneB) {
  return zoneA.cell.id * 1000000 + zoneB.cell.id + 1;
}

function isClose(a, b) {
  return (Math.abs(a.x - b.x) < 3) && (Math.abs(a.y - b.y) < 3);
}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
