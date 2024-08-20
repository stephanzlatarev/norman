import Mission from "../mission.js";
import { ALERT_WHITE } from "../map/alert.js";
import Zone from "../map/zone.js";

const SURROUND_BALANCE = 1;

export default class BattleStation extends Mission {

  run() {
    for (const zone of Zone.list()) {
      if (zone.battle) {
        const battle = zone.battle;
        const stations = selectStations(battle);

        if (stations.length) {
          for (const fighter of battle.fighters) {
            setStation(fighter, stations);
          }
        } else {
          for (const fighter of battle.fighters) {
            fighter.close();
          }
        }

        battle.stations = stations;
      }
    }
  }

}

function setStation(fighter, stations) {
  // If fighter is already assigned to a valid station then keep the assigned station
  if (stations.find(station => (fighter.station === station))) return;

  // If fighter is stationed in a zone with a valid station then re-assign the fighter to that station
  for (const station of stations) {
    if (fighter.station.zone === station.zone) {
      fighter.station = station;
      return;
    }
  }

  // If fighter station moved away from battle then re-assign the fighter to that station
  let backAwayStation;
  for (const station of stations) {
    if (station.zone.tier.level >= fighter.zone.tier.level) continue;
    if (!isNeighborZone(station.zone, fighter.zone)) continue;

    backAwayStation = station;
  }
  if (backAwayStation) {
    fighter.station = backAwayStation;
    return;
  }

  // Otherwise, use the closest station
  if (fighter.assignee && fighter.isDeployed) {
    fighter.station = getClosestStation(fighter.assignee, stations);
  } else {
    fighter.station = stations[0];
  }
}

function isNeighborZone(a, b) {
  for (const corridor of a.corridors) {
    for (const neighbor of corridor.zones) {
      if (b === neighbor) return true;
    }
  }

  return false;
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

function selectStations(battle) {
  const zones = new Set();
  const done = new Set();

  let wave = new Set(battle.zones);

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
      done.add(zone);

      if (isCellInThreatsRange(battle, getStation(zone))) {
        for (const corridor of zone.corridors) {
          for (const neighbor of corridor.zones) {
            if (!done.has(neighbor)) {
              next.add(neighbor);
            }
          }
        }
      } else if (zone.alertLevel <= ALERT_WHITE) {
        zones.add(zone);
      }
    }

    wave = next;
  }

  if ((zones.size > 1) && (battle.recruitedBalance < SURROUND_BALANCE)) {
    // We don't have enough army to surround enemy. Focus on the lowest tier station.
    let focus;

    for (const zone of zones) {
      if (!focus || (zone.tier.level < focus.tier.level)) {
        focus = zone;
      }
    }

    return [getStation(focus)];
  }

  return [...zones].map(getStation);
}

function getStation(zone) {
  return zone.isDepot ? zone.exitRally : zone.cell;
}

function isCellInThreatsRange(battle, cell) {
  for (const zone of battle.zones) {
    for (const threat of zone.threats) {
      if (!threat.type.rangeGround) continue; // TODO: Add range for spell casters

      const range = Math.max(threat.type.rangeGround + 4, 8);

      if (calculateSquareDistance(threat.body, cell) <= range * range) {
        return true;
      }
    }
  }
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
