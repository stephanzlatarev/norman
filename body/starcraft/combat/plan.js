import Mission from "./mission.js";

let base;

export default function(units, plans) {
  const missions = [];

  if (plans && plans.length) {
    convertPlansToMissions(plans, missions);
  } else {
    // TODO: Move this outside the else condition.
    // TODO: Create a mission with all enemies as targets for all warriors that have no assignments 
    createDefaultMissions(units, missions)
  }

  return missions;
}

function convertPlansToMissions(plans, missions) {
  for (const plan of plans) {
    missions.push(new Mission(plan.type, plan));
  }
}

// TODO: If there's an enemy unit attack it. If not scout around
function createDefaultMissions(units, missions) {
  const target = findClosestEnemy(units);

  if (target) {
    missions.push(new Mission(Mission.Assault, target));
  }
}

function findClosestEnemy(units) {
  if (!base) {
    for (const unit of units.values()) {
      if (unit.isOwn && !unit.isWarrior) {
        base = unit;
        break;
      }
    }
  }

  if (base) {
    let bestTarget;
    let bestDistance = Infinity;

    for (const unit of units.values()) {
      if (unit.isEnemy) {
        const distance = calculateDistance(unit.body, base.body);

        if (distance < bestDistance) {
          bestTarget = unit;
          bestDistance = distance;
        }
      }
    }

    return bestTarget;
  }
}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
