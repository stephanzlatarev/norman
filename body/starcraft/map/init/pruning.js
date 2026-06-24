import Depot from "../depot.js";
import Zone from "../zone.js";

export async function pruneExits(client) {
  const pathing = [];
  const pruning = [];
  const traversed = new Set();

  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    // Exits of home and enemy bases don't need pruning
    if (zone === Depot.home) continue;
    if (zone === Depot.enemy) continue;

    for (const [neighbor, corridor] of zone.exits) {
      if (!corridor.isGroundPassable) continue;
      if (neighbor === Depot.home) continue;
      if (neighbor === Depot.enemy) continue;
      if (traversed.has(corridor)) continue;
      traversed.add(corridor);

      for (let i = 1; i < corridor.path.length; i++) {
        if (!corridor.path[i].isPath) {
          console.log("[map]", zone.name, neighbor.name, "corridor's path has no path cells!");
          break;
        }

        pathing.push({ startPos: pos(corridor.path[i - 1]), endPos: pos(corridor.path[i]) });
        pruning.push({ corridor, zone, neighbor });
      }
    }
  }

  if (pathing.length) {
    const response = await client.query({ pathing });

    for (let i = 0; i < response.pathing.length; i++) {
      if (isPathBlocked(pathing[i], response.pathing[i].distance)) {
        const { corridor, zone, neighbor } = pruning[i];

        if (corridor.isGroundPassable) {
          console.log("[map] Close corridor", corridor.name);
        }

        corridor.isGroundPassable = false;
        zone.neighbors.delete(neighbor);
        neighbor.neighbors.delete(zone);
      }
    }
  }
}

function isPathBlocked(path, distance) {
  if (!distance) return true;

  // Expect no more than 20% longer than straight line
  const expected = calculateSquareDistance(path.startPos, path.endPos) * 1.44;
  const actual = distance * distance;

  return (actual > expected);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

function pos(cell) {
  return { x: cell.x, y: cell.y };
}
