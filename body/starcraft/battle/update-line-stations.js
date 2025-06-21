import Board from "../map/board.js";
import Depot from "../map/depot.js";

export default function(battle) {
  const wall = getWall(battle);

  for (const line of battle.lines) {
    if (line.fighters.length > line.stations.length) {
      if (wall) {
        addStationsAroundWall(wall, line.stations, line.fighters);
      } else {
        addStationsAroundRally(line.zone.rally, line.stations, line.fighters);
      }
    } else if (line.fighters.length < line.stations.length) {
      removeStations(line.stations, line.fighters);
    }
  }
}

function getWall(battle) {
  if (battle.lines.length !== 1) return;

  for (const zone of battle.zones) {
    if (zone === Depot.home) {
      for (const site of zone.sites) {
        if (site.isWall && site.wall.length) {
          return site.wall[0];
        }
      }
    }
  }
}

const MATRIX_WALL_STATIONS = [];
for (let x = -5; x <= 5; x++) {
  for (let y = -5; y <= 5; y++) {
    MATRIX_WALL_STATIONS.push({ x, y, d: x * x + y * y });
  }
}
MATRIX_WALL_STATIONS.sort((a, b) => (b.d - a.d));

function addStationsAroundWall(wall, stations, fighters) {
  const taken = new Set(stations);

  let addCount = fighters.length - stations.length;

  for (const { x, y } of MATRIX_WALL_STATIONS) {
    const cell = Board.cell(wall.x + x, wall.y + y);

    if (cell && (cell.zone === wall.zone) && cell.isPath && !cell.isObstacle && !taken.has(cell)) {
      stations.push(cell);
      cell.isHoldStation = true;
      taken.add(cell);
      addCount--;

      if (addCount <= 0) break;
    }
  }
}

function addStationsAroundRally(rally, stations, fighters) {
  const taken = new Set(stations);
  const traversed = new Set();

  let addCount = fighters.length - stations.length;
  let wave = new Set([rally]);

  if (!taken.has(rally)) {
    stations.push(rally);
    cell.isHoldStation = false;
    taken.add(rally);
    addCount--;
  }

  while (wave.size && (addCount > 0)) {
    const next = new Set();

    for (const cell of wave) {
      traversed.add(cell);

      if (!taken.has(cell)) {
        stations.push(cell);
        cell.isHoldStation = false;
        taken.add(cell);
        addCount--;

        if (addCount <= 0) break;
      }

      for (const neighbor of cell.neighbors) {
        if ((neighbor.zone === rally.zone) && neighbor.isPath && !neighbor.isObstacle && !traversed.has(neighbor)) {
          next.add(neighbor);
        }
      }
    }

    wave = next;
  }
}

function removeStations(stations, fighters) {
  let removeCount = stations.length - fighters.length;

  for (let i = stations.length - 1; (i >= 0) && (removeCount > 0); i--) {
    const station = stations[i];

    if (!fighters.find(fighter => (fighter.station === station))) {
      stations.splice(i, 1);
      removeCount--;
    }
  }
}
