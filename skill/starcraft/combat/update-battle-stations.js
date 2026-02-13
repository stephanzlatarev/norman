import { Board, Depot } from "./imports.js";

export default function(battle) {
  const stations = new Set();

  for (const station of battle.stations) {
    if (station.zone === battle.rally) {
      stations.add(station);
    }
  }

  if (battle.stations.length !== stations.size) {
    battle.stations = [...stations];
  }

  if (battle.fighters.length > battle.stations.length) {
    const wall = getWall(battle.front) || getWall(battle.rally);

    if (wall) {
      addStationsAroundWall(wall, battle.stations, battle.fighters);
    } else {
      addStationsAroundRally(battle.rally, battle.stations, battle.fighters);
    }
  } else if (battle.fighters.length < battle.stations.length) {
    removeStations(battle.stations, battle.fighters);
  }
}

function getWall(zone) {
  if (zone === Depot.home) {
    for (const site of zone.sites) {
      if (site.isWall && site.wall.length) {
        return site.wall[0];
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

function addStationsAroundRally(zone, stations, fighters) {
  const rally = zone.rally;
  const plot = zone.plot || new Set();
  const sitecells = zone.sitecells || new Set();
  const taken = new Set(stations);
  const traversed = new Set();

  let addCount = fighters.length - stations.length;
  let wave = new Set([rally]);

  if (!taken.has(rally) && !plot.has(rally)) {
    stations.push(rally);
    rally.isHoldStation = false;
    taken.add(rally);
    addCount--;
  }

  while (wave.size && (addCount > 0)) {
    const next = new Set();

    for (const cell of wave) {
      traversed.add(cell);

      if (!taken.has(cell) && !plot.has(cell) && !sitecells.has(cell)) {
        stations.push(cell);
        cell.isHoldStation = false;
        taken.add(cell);
        addCount--;

        if (addCount <= 0) break;
      }

      for (const one of cell.rim) {
        if ((one.zone === zone) && one.isPath && !one.isObstacle && !traversed.has(one)) {
          next.add(one);
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
