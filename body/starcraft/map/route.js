import { ALERT_WHITE } from "./alert.js";
import Zone from "./zone.js";

const path = new Map();
const hops = new Map();

export function createRoutes() {
  const zones = Zone.list();

  for (const zone of zones) {
    path.set(key(zone, zone), { zone: zone, distance: 0 });

    for (const neighbor of zone.neighbors) {
      const distance = Math.sqrt((zone.x - neighbor.x) * (zone.x - neighbor.x) + (zone.y - neighbor.y) * (zone.y - neighbor.y));

      path.set(key(neighbor, zone), { zone, distance });
    }
  }
}

export function syncRoutes() {
  hops.clear();
}

export function getHopDistance(startCell, destinationCell) {
  const hop = getHop(startCell, destinationCell);

  return hop ? hop.distance : Infinity;
}

export function getHopZone(startCell, destinationCell) {
  const hop = getHop(startCell, destinationCell);

  if (hop) {
    return hop.zone;
  }
}

export function getHopRoute(startCell, destinationCell) {
  const route = [];

  let hop = getHop(startCell, destinationCell);

  while (hop && (hop.zone !== route[route.length - 1])) {
    route.push(hop.zone);

    hop = getHop(hop.zone.cell, destinationCell);
  }

  return route;
}

function getHop(startCell, destinationCell) {
  if (!startCell || !startCell.zone || !startCell.zone.cell) return;
  if (!destinationCell || !destinationCell.zone || !destinationCell.zone.cell) return;

  const destination = destinationCell.zone;
  const direction = key(startCell.zone, destination);

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

      for (const neighbor of zone.neighbors) {
        if (done.has(neighbor)) continue;

        if (neighbor.alertLevel <= ALERT_WHITE) {
          next.add(neighbor);
        }

        const directionNeighborToDestination = key(neighbor, destination);
        const hopNeighborToDestination = path.get(directionNeighborToDestination) || hops.get(directionNeighborToDestination);

        if (!hopNeighborToDestination || (hopZoneToDestination.distance < hopNeighborToDestination.distance)) {
          hops.set(directionNeighborToDestination, { zone: zone, distance: hopZoneToDestination.distance });
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
