import Mission from "../mission.js";
import Battle from "../battle/battle.js";
import GameMap from "../map/map.js";
import { getHopDistance } from "../map/route.js";
import Wall from "../map/wall.js";

let wallBaseCell;
let wallStation;
let wallZones;

export default class BattleStation extends Mission {

  run() {
    if (!wallZones) findWallZones();

    for (const battle of Battle.list()) {
      if (wallStation && wallZones.has(battle.zone)) {
        battle.setStations([wallStation]);
      } else {
        updateBattleStations(battle);
      }
    }
  }

}

function findWallZones() {
  const walls = Wall.list();

  wallZones = new Set();

  if (walls.length) {
    const wall = walls[0];

    wallZones.add(wall.cell.zone);

    for (const zone of wall.zones) {
      wallZones.add(zone);

      if (!wallBaseCell || (zone.tier.level < wallBaseCell.zone.tier.level)) wallBaseCell = zone.cell;
    }

    wallStation = GameMap.cell(wall.blueprint.rally.x, wall.blueprint.rally.y);
  }
}

function updateBattleStations(battle) {
  const stations = selectBattleStations(battle);
  let active = [];

  if (stations.size) {
    active = selectActiveStations(battle, stations, (battle.range === Battle.RANGE_BACK) ? 1 : 3);

    assignAllFightersToStations(battle, stations, active);
  }

  battle.setStations(active);
}

function selectBattleStations(battle) {
  const stations = new Set();
  const zones = (battle.range === Battle.RANGE_FRONT) ? selectStationZones(battle, battle.hotspot.front) : battle.hotspot.back;

  for (const zone of zones) {
    stations.add(getStation(zone));
  }

  return stations;
}

// Selects the closest zones in each corridor direction from the battle zone
function selectStationZones(battle, zones) {
  const stationZones = new Set();

  if (!zones.size) return stationZones;

  if (zones.has(battle.zone)) {
    stationZones.add(battle.zone);
    return stationZones;
  }

  for (const corridor of battle.zone.corridors) {
    const closestZones = getClosestZonesInDirection(zones, battle.zone, corridor);

    for (const zone of closestZones) {
      stationZones.add(zone);
    }
  }

  return stationZones;
}

function getClosestZonesInDirection(zones, center, direction) {
  let stationZones = new Set();
  let leastDistance = Infinity;

  for (const zone of zones) {
    const hops = center.getHopsTo(zone);

    if (!hops || (hops.direction !== direction)) continue;

    if (hops.distance < leastDistance) {
      stationZones = new Set([zone]);
      leastDistance = hops.distance;
    } else if (hops.distance === leastDistance) {
      stationZones.add(zone);
    }
  }

  return stationZones;
}

function getStation(zone) {
  return zone.isDepot ? zone.exitRally : zone.cell;
}

function selectActiveStations(battle, stations, limit) {
  if (stations.size <= limit) return [...stations];

  const distance = new Map();
  const deployments = new Map();

  for (const station of stations) {
    distance.set(station, getHopDistance(station, wallBaseCell));
    deployments.set(station, countStationDeployments(battle, station));
  }

  const active = [...stations].sort((a, b) => orderByDistanceAndDeployments(a, b, distance, deployments));
  active.length = limit;

  return active;
}

function orderByDistanceAndDeployments(a, b, distance, deployments) {
  const distanceA = distance.get(a);
  const distanceB = distance.get(b);

  if (distanceA === distanceB) {
    return deployments.get(b) - deployments.get(a);
  }

  return distanceA - distanceB;
}

function countStationDeployments(battle, station) {
  const zone = station.zone;
  let count = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive) {
      if (warrior.zone === zone) {
        count += 4;
      } else if (zone.range.fire.has(warrior.zone)) {
        count += 3;
      } else if (zone.range.front.has(warrior.zone)) {
        count += 2;
      } else if (zone.range.back.has(warrior.zone)) {
        count += 1;
      }
    }
  }

  return count;
}

function assignAllFightersToStations(battle, stations, active) {
  const distances = new Map();

  for (const fighter of battle.fighters) {
    setStation(fighter, stations, active, distances);
  }
}

function setStation(fighter, stations, active, distances) {
  const warrior = fighter.assignee;

  if (!warrior || !warrior.isAlive) return;

  if (fighter.isDeployed) {

    // If fighter is stationed in a zone of an active station, then make sure the fighter is assigned to that station
    for (const station of active) {
      if (fighter.zone === station.zone) {
        return fighter.setStation(station);
      }
    }

    // Otherwise, use the closest active station
    fighter.setStation(getClosestUnobstructedStation(warrior, active, distances) || getClosestStation(warrior, stations));

  } else {
    // If warrior is not yet deployed, then make sure it is assigned to the closest active station
    if (active.length) fighter.setStation(getClosestStation(warrior, active));
  }
}

function getClosestUnobstructedStation(warrior, stations, distances) {
  let bestStation;
  let bestDistance = Infinity;

  for (const station of stations) {
    const warriorDistance = getDistance(distances, warrior, station);

    if (bestDistance < warriorDistance) continue;

    let isObstructed = false;

    for (const threat of warrior.zone.threats) {
      const threatDistance = getDistance(distances, threat, station);

      if (threatDistance <= warriorDistance) {
        isObstructed = true;
        break;
      }
    }

    if (!isObstructed) {
      bestStation = station;
      bestDistance = warriorDistance;
    }
  }

  return bestStation;
}

function getDistance(distances, unit, station) {
  let map = distances.get(station);

  if (!map) {
    map = new Map();
    distances.set(station, map);
  }

  let distance = map.get(unit);

  if (!distance) {
    distance = calculateSquareDistance(unit.body, station);
    map.set(unit, distance);
  }

  return distance;
}

function getClosestStation(warrior, stations) {
  let closestStation;
  let closestDistance = Infinity;

  for (const station of stations) {
    const distance = calculateSquareDistance(warrior.body, station);

    if (distance < closestDistance) {
      closestStation = station;
      closestDistance = distance;
    }
  }

  return closestStation;
}



function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
