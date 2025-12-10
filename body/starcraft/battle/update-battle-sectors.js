
export default function(battle) {
  const sectors = new Set();

  // Add sector of battle front center
  sectors.add(battle.front.cell.sector);

  // Add sector of battle rally point
  sectors.add(battle.rally.cell.sector);

  // Add known threats in battle front
  for (const space of battle.front.sectors) {
    for (const threat of space.threats) {
      if (threat.zone === battle.front) {
        sectors.add(threat.sector);
      }
    }
  }

  // Add fighter stations
  for (const station of battle.stations) {
    sectors.add(station.sector);
  }

  // Add neighboring sectors to cover fire range
  for (const sector of [...sectors]) {
    for (const neighbor of sector.neighbors) {
      sectors.add(neighbor);
    }
  }

  // TODO: Connect the sectors so that there's no gap between them

  battle.sectors = sectors;
}
