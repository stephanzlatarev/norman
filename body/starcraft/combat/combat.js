import engage from "./engage.js";
import maneuver from "./maneuver.js";

export default class Combat {

  run(units) {
    // Update combat properties of units
    for (const unit of units.values()) {
      sync(unit);
    }

    // Body skill "engage"
    const fights = engage(units);

    // Body skill "maneuver"
    return maneuver(fights);
  }

}

function sync(unit) {
  if (unit.combat) {
    // Update combat properties
    unit.combat.health = unit.health + unit.shield;
    unit.combat.order = null;
  } else {
    // Initialize combat properties
    unit.combat = {
      // Fixed properties
      isWarrior: (unit.owner === 1) && unit.kind && (unit.kind.damage > 0),
      isEnemy: (unit.owner === 2),
      isObstacle: !unit.kind || !unit.kind.damage,

      // Changing properties
      health: unit.health + unit.shield,
      order: null,
    };
  }
}
