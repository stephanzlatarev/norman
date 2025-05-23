import { ActiveCount } from "../memo/count.js";

export default function(battle) {
  const battery = getShieldBattery(battle);

  if (battery) {
    for (const line of battle.lines) {
      line.stations = [battery.cell];
    }
  } else {
    for (const line of battle.lines) {
      if (line.fighters.length > line.stations.length) {
        addStations(line.zone, line.stations, line.fighters);
      } else if (line.fighters.length < line.stations.length) {
        removeStations(line.stations, line.fighters);
      }
    }
  }
}

function getShieldBattery(battle) {
  if (!ActiveCount.ShieldBattery) return;

  for (const zone of battle.zones) {
    for (const building of zone.buildings) {
      if (building.type.name === "ShieldBattery") {
        return building;
      }
    }
  }
}

function addStations(zone, stations, fighters) {
  const rally = zone.rally;
  const taken = new Set(stations);
  const traversed = new Set();

  let addCount = fighters.length - stations.length;
  let wave = new Set([rally]);

  if (!taken.has(rally)) {
    stations.push(rally);
    taken.add(rally);
    addCount--;
  }

  while (wave.size && (addCount > 0)) {
    const next = new Set();

    for (const cell of wave) {
      traversed.add(cell);

      if (!taken.has(cell)) {
        stations.push(cell);
        taken.add(cell);
        addCount--;

        if (addCount <= 0) break;
      }

      for (const neighbor of cell.neighbors) {
        if ((neighbor.zone === zone) && neighbor.isPath && !neighbor.isObstacle && !traversed.has(neighbor)) {
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
