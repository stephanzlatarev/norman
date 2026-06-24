import Board from "../board.js";
import Zone from "../zone.js";

let monitored;
let loop;

export async function syncCorridors(client) {
  if (!monitored) listCorridors();
  if (!monitored.size) return;
  if (loop === Board.refreshLoop) return;

  const pathing = [];
  const corridors = [];
  const opened = new Set();
  const closed = new Set();

  for (const corridor of monitored) {
    for (let i = 1; i < corridor.path.length; i++) {
      pathing.push({ startPos: pos(corridor.path[i - 1]), endPos: pos(corridor.path[i]) });
      corridors.push(corridor);
    }
  }

  if (pathing.length) {
    const response = await client.query({ pathing });

    for (let i = 0; i < response.pathing.length; i++) {
      const corridor = corridors[i];

      if (isPathBlocked(pathing[i], response.pathing[i].distance)) {
        closed.add(corridor);
      } else {
        opened.add(corridor);
      }
    }
  }

  for (const corridor of monitored) {
    if (opened.has(corridor) && !closed.has(corridor)) {
      console.log("[map] Open corridor", corridor.name);

      const start = corridor.path[0].zone;
      const end = corridor.path[corridor.path.length - 1].zone;

      start.neighbors.add(end);
      end.neighbors.add(start);

      if (corridor.via) {
        corridor.via.neighbors.add(start);
        corridor.via.neighbors.add(end);
      }

      corridor.isGroundPassable = true;

      monitored.delete(corridor);
    }
  }

  loop = Board.refreshLoop;
}

function listCorridors() {
  monitored = new Set();

  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    for (const [neighbor, corridor] of zone.exits) {
      if (!neighbor.isDepot && !neighbor.isHall) continue;
      if (corridor.isGroundPassable) continue;

      monitored.add(corridor);
    }
  }
}

function pos(cell) {
  return { x: cell.x, y: cell.y };
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
