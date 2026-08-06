import Battle from "./battle.js";
import TargetMatrix from "./target-matrix.js";

export default function(battle) {
  if (battle.mode === Battle.MODE_FIGHT) {
    setFightTargets(battle);
  } else if (battle.mode === Battle.MODE_SMASH) {
    setSmashTargets(battle);
  } else if (battle.mode === Battle.MODE_WEAR) {
    setFightTargets(battle);
  } else {
    setKiteTargets(battle);
  }
}

function setFightTargets(battle) {
  const matrix = new TargetMatrix(battle);

  assignWarriorsInRangeOfTargets(matrix);
  assignRemainingWarriors(battle, matrix);
}

function assignWarriorsInRangeOfTargets(matrix) {
  for (const target of matrix.targetsInRange) {
    assignWarriorsToTarget(matrix, target);
  }
}

function assignWarriorsToTarget(matrix, target) {
  const warriors = matrix.listWarriorsForTargetByInRangeOtherTargets(target);
  let health = target.armor.total;

  for (const warrior of warriors) {
    const attack = target.body.isFlying ? warrior.type.attackAir : warrior.type.attackGround;

    matrix.assign(warrior, target); 
    health -= attack;

    if (health <= 0) return;
  }
}

function assignRemainingWarriors(battle, matrix) {
  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior && !matrix.isWarriorAssigned(warrior)) {
      fighter.target = getClosestTarget(warrior, matrix.primaryTargets, true)
        || getClosestTarget(warrior, matrix.primaryTargets, false)
        || getClosestTarget(warrior, matrix.allTargets);
    }
  }
}

function setSmashTargets(battle) {
  const threats = [];
  const contacts = [];
  const tumors = [];

  for (const sector of battle.sectors) {
    threats.push(...sector.threats);

    for (const contact of sector.contacts) {
      if (contact.type.isTumor) {
        tumors.push(contact);
      } else {
        contacts.push(contact);
      }
    }
  }

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior) {
      fighter.target = getClosestSmashTarget(warrior, battle.detector?.assignee, threats, contacts, tumors);
    }
  }
}

function setKiteTargets(battle) {
  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior) {
      const targets = [];

      for (const sector of battle.sectors) {
        targets.push(...sector.threats);
      }

      fighter.target = getClosestTarget(warrior, targets, true);
    }
  }
}

function getClosestTarget(warrior, targets, isInSight) {
  let closestTarget;
  let closestDistance = Infinity;

  for (const target of targets) {
    if (!warrior.canShootTarget(target, isInSight)) continue;

    const distance = calculateSquareDistance(warrior.body, target.body);

    if (distance < closestDistance) {
      closestTarget = target;
      closestDistance = distance;
    }
  }

  return closestTarget;
}

function getClosestSmashTarget(warrior, detector, ...targetGroups) {
  for (const targets of targetGroups) {
    let primaryTarget;
    let primaryDistance = Infinity;
    let secondaryTarget;
    let secondaryDistance = Infinity;

    for (const target of targets) {
      if (!warrior.canShootTarget(target, false)) continue;

      if (target.zone && detector) {
        const distance = calculateSquareDistance(detector.body, target.body);

        if (distance < primaryDistance) {
          primaryTarget = target;
          primaryDistance = distance;
        }
      }

      if (target.zone && target.isValidShootingTarget(true)) {
        const distance = calculateSquareDistance(warrior.body, target.body);

        if (distance < primaryDistance) {
          primaryTarget = target;
          primaryDistance = distance;
        }
      } else if (target.isValidShootingTarget()) {
        const distance = calculateSquareDistance(warrior.body, target.body);

        if (distance < secondaryDistance) {
          secondaryTarget = target;
          secondaryDistance = distance;
        }
      }
    }

    if (primaryTarget) return primaryTarget;
    if (secondaryTarget) return secondaryTarget;
  }
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
