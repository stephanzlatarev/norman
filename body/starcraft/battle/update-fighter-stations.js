
export default function(battle) {
  for (const line of battle.lines) {
    if (!line.stations.length) continue;

    const station = line.stations[0];

    for (const fighter of line.fighters) {
      fighter.setStation(station);
    }
  }
}
