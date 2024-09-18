import Mission from "../mission.js";
import Battle from "../battle/battle.js";
import Map from "../map/map.js";
import Wall from "../map/wall.js";

let wallStation;
let wallZones;

export default class BattleStation extends Mission {

  run() {
    if (!wallStation) findWallZones();

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
    }

    wallStation = Map.cell(wall.blueprint.rally.x, wall.blueprint.rally.y);
  }
}

function updateBattleStations(battle) {
  const stations = selectBattleStations(battle);
  const limit = (battle.range === Battle.RANGE_BACK) ? 1 : 3;
  let active = [];

  if (stations.size) {
    // Select active stations by proximity to fighters, up to the limit
    if (stations.size <= limit) {
      active = [...stations];
    } else if (limit === 1) {
      active = [selectSingleStation(battle, stations)];
    } else {
      active = selectMultipleStations(battle, stations, limit);
    }

    // Assign the fighters to the active stations again by proximity
    for (const fighter of battle.fighters) {
      setStation(fighter, stations, active);
    }
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

function selectSingleStation(battle, stations) {
  let selection = findExistingBattleStation(stations, battle.stations);
  let selectionDeployments = -1;

  for (const station of stations) {
    if (!selection || (station.zone.tier.level < selection.zone.tier.level)) {
      selection = station;
      selectionDeployments = -1;
    } else {
      const deployments = countStationDeployments(battle, station);

      if (selectionDeployments < 0) selectionDeployments = countStationDeployments(battle, selection);

      if (deployments > selectionDeployments) {
        selection = station;
        selectionDeployments = deployments;
      }
    }
  }

  return selection;
}

function findExistingBattleStation(stations, battleStations) {
  for (const station of stations) {
    for (const one of battleStations) {
      if (station.zone === one.zone) return station;
    }
  }
}

function selectMultipleStations(battle, stations, limit) {
  const list = [...stations].map(station => ({ station: station, deployments: countStationDeployments(battle, station) }));

  list.sort((a, b) => (b.deployments - a.deployments));

  if (list.length > limit) {
    list.length = limit;
  }

  return list.map(one => one.station);
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

function setStation(fighter, stations, active) {
  const warrior = fighter.assignee;

  if (!warrior || !warrior.isAlive) return;

  if (fighter.isDeployed) {

    // If fighter is stationed in a zone with a valid station, then make sure the fighter is assigned to that station
    for (const station of stations) {
      if (fighter.zone === station.zone) {
        return fighter.setStation(station);
      }
    }

    // Otherwise, use the closest station
    fighter.setStation(getClosestStation(warrior, stations));

  } else {
    // If warrior is not yet deployed, then make sure it is assigned to the closest active station
    if (active.length) fighter.setStation(getClosestStation(warrior, active));
  }
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
