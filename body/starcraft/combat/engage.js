
export default function(units, missions) {
  if (missions.length) {
    const mission = missions[0];

    for (const unit of units.values()) {
      if (unit.isWarrior) {
        mission.engage(unit);
      }
    }
  }
}
