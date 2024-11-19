
export default function(battle) {
  for (const line of battle.lines) {
    line.stations = [getStation(line)];
  }
}

function getStation(line) {
  const zone = line.zone;

  return zone.isDepot ? zone.exitRally : zone.cell;
}
