import Mission from "./mission.js";

let base;

export default function(units, plans) {
  if (plans && plans.length) {
    return convertPlansToMissions(plans);
  }

  if (!base) {
    base = selectBase(units);
  }

  const missions = [];
  const target = findClosestEnemy(units);

  if (target) {
    missions.push(new Mission(Mission.Assault, target));
  }

  return missions;
}

function convertPlansToMissions(plans) {
  const missions = [];

  for (const plan of plans) {
    missions.push(new Mission(plan.type, plan));
  }

  return missions;
}

function selectBase(units) {
  for (const unit of units.values()) {
    if (unit.isOwn && !unit.isWarrior) {
      return unit;
    }
  }
}

function findClosestEnemy(units) {
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
