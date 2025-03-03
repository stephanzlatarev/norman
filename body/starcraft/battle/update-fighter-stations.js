
export default function(battle) {
  for (const line of battle.lines) {
    if (!line.stations.length) continue;

    // If there's only one station, e.g. around shield battery, then assign all to it.
    if (line.stations.length === 1) {
      const station = line.stations[0];

      for (const fighter of line.fighters) {
        fighter.setStation(station);
      }

      continue;
    }

    const stations = new Set(line.stations);
    const takenStations = new Set();
    const remainingStations = [];
    const remainingFighters = [];

    for (const fighter of line.fighters) {
      const station = fighter.station;

      if (station && stations.has(fighter.station)) {
        if (takenStations.has(station)) {
          remainingFighters.push(fighter);
        } else {
          takenStations.add(fighter.station);
        }
      } else {
        remainingFighters.push(fighter);
      }
    }

    for (const station of stations) {
      if (!takenStations.has(station)) {
        remainingStations.push(station);
      }
    }

    for (let i = 0; (i < remainingFighters.length) && (i < remainingStations.length); i++) {
      remainingFighters[i].setStation(remainingStations[i]);
    }
  }
}
