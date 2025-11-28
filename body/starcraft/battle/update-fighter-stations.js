
export default function(battle) {
  if (!battle.stations.length) return;

  // If there's only one station, e.g. around shield battery, then assign all to it.
  if (battle.stations.length === 1) {
    const station = battle.stations[0];

    for (const fighter of battle.fighters) {
      fighter.setStation(station);
    }

    return;
  }

  const stations = new Set(battle.stations);
  const takenStations = new Set();
  const reassignFighters = [];
  const unassignedFighters = [];
  const remainingStations = [];

  for (const fighter of battle.fighters) {
    const station = fighter.station;

    if (station && stations.has(station)) {
      if (takenStations.has(station)) {
        reassignFighters.push(fighter);
      } else {
        takenStations.add(station);
      }
    } else {
      unassignedFighters.push(fighter);
    }
  }

  for (const station of stations) {
    if (!takenStations.has(station)) {
      remainingStations.push(station);
    }
  }

  if (remainingStations.length) {
    if (unassignedFighters.length) {
      for (let i = 0; i < unassignedFighters.length; i++) {
        unassignedFighters[i].setStation(remainingStations[i % remainingStations.length]);
      }
    } else if (reassignFighters.length) {
      for (let i = 0; i < reassignFighters.length; i++) {
        reassignFighters[i].setStation(remainingStations[i % remainingStations.length]);
      }
    }
  }
}
