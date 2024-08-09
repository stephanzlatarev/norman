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
        if (neighbor !== zone) {
          path.set(key(neighbor, zone), { corridor: corridor, zone: zone, distance: corridor.distance });
        }
      }
    }
  }
}

export function syncRoutes() {
  hops.clear();
}

export function getHopDistance(startCell, destinationCell) {
  if (!startCell || !startCell.zone || !startCell.zone.cell) return Infinity;
  if (!destinationCell || !destinationCell.zone || !destinationCell.zone.cell) return Infinity;

  const hop = getHop(startCell.zone, destinationCell.zone);

  return hop ? hop.distance : Infinity;
}

export function getHopZone(startCell, destinationCell) {
  if (!startCell || !startCell.zone || !startCell.zone.cell) return;
  if (!destinationCell || !destinationCell.zone || !destinationCell.zone.cell) return;

  const hop = getHop(startCell.zone, destinationCell.zone);

  if (hop && hop.corridor) {
    return isClose(startCell, hop.corridor) ? hop.zone : hop.corridor;
  }
}

function getHop(start, destination) {
  if (destination.isCorridor) return { corridor: null, zone: destination, distance: 0 }; // This is a limitation for now

  const direction = key(start, destination);

  return path.get(direction) || hops.get(direction) || findHop(direction, destination);
}

function findHop(direction, destination) {
  const done = new Set();
  let wave = new Set();

  wave.add(destination);

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
      const directionZoneToDestination = key(zone, destination);
      const hopZoneToDestination = path.get(directionZoneToDestination) || hops.get(directionZoneToDestination);

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

          if (corridor.cells.size) {
            hops.set(key(corridor, destination), { corridor: corridor, zone: zone, distance: distance });
          }
        }
      }

      done.add(zone);
    }

    wave = next;
  }

  return hops.get(direction);
}

function key(zoneA, zoneB) {
  return zoneA.cell.id * 1000000 + zoneB.cell.id + 1;
}

function isClose(a, b) {
  return (Math.abs(a.x - b.x) < 3) && (Math.abs(a.y - b.y) < 3);
}
