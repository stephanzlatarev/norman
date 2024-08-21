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
          const focus = getFocusStation(battle, stations);

          for (const fighter of battle.fighters) {
            setStation(fighter, stations, focus);
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

function setStation(fighter, stations, focus) {
  // If fight job is still open, or warrior is not yet deployed, then switch it to the focus station
  if (focus && !fighter.isDeployed) {
    return fighter.setStation(focus);
  }

  // If fighter is already assigned to a valid station then keep the assigned station
  if (stations.find(station => (fighter.station === station))) return;

  // If fighter is stationed in a zone with a valid station then re-assign the fighter to that station
  for (const station of stations) {
    if (fighter.station.zone === station.zone) {
      return fighter.setStation(station);
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
    return fighter.setStation(backAwayStation);
  }

  // Otherwise, use the closest station
  if (fighter.assignee && fighter.isDeployed) {
    return fighter.setStation(getClosestStation(fighter.assignee, stations));
  } else if (focus) {
    return fighter.setStation(focus);
  } else {
    return fighter.setStation(stations[0]);
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

  return [...zones].map(getStation);
}

function getFocusStation(battle, stations) {
  if ((stations.length > 1) && (battle.recruitedBalance < SURROUND_BALANCE)) {
    // We don't have enough army to surround enemy. Focus on the lowest tier station.
    let focus;

    for (const station of stations) {
      if (!focus || (station.zone.tier.level < focus.zone.tier.level)) {
        focus = station;
      }
    }

    return focus;
  }
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
