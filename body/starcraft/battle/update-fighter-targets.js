import Battle from "../battle/battle.js";
import Resources from "../memo/resources.js";

export default function(battle) {
  if (battle.mode === Battle.MODE_FIGHT) {
    setFightTargets(battle);
  } else if (battle.mode === Battle.MODE_SMASH) {
    setFightTargets(battle);
  } else {
    setKiteTargets(battle);
  }
}

/**
- Filter targets in range of ranged warriors
- Sort targets by how dangareous it is - damage divided by armor
- For each target:
  - Filter warriors in range
  - Sort warrior by other targets in range
  - Assign targets, until target health is less than assigned warrior damage
**/
class TargetMatrix {

  primaryTargets = [];
  targetsInRange = [];
  targetToWarriors = new Map();
  warriorToDamage = new Map();
  warriorToTargets = new Map();
  warriorToFightJob = new Map();
  assignedWarriors = new Set();

  constructor(battle) {
    const groundWarriors = new Set();
    const airRangeWarriors = new Set();
    const groundRangeWarriors = new Set();

    for (const fighter of battle.fighters) {
      const warrior = fighter.assignee;
      if (!warrior || !warrior.isAlive) continue;
      if (warrior.type.rangeAir > 1) airRangeWarriors.add(warrior);
      if (warrior.type.rangeGround > 1) groundRangeWarriors.add(warrior);
      groundWarriors.add(warrior);
      this.warriorToFightJob.set(warrior, fighter);
    }

    for (const zone of battle.zones) {
      for (const threat of zone.threats) {
        if (!threat.type.isWarrior) continue;
        if (!isValidTarget(threat)) continue;

        // Treat the enemy warriors that are in the battle zone and those that have range over my warriors as primary targets
        if ((zone === battle.zone) || isEnemyWarriorAbleToAttack(threat, groundWarriors)) {
          this.primaryTargets.push(threat);
        }
      }
    }

    for (const target of this.primaryTargets) {
      const warriors = target.body.isFlying ? airRangeWarriors : groundRangeWarriors;

      for (const warrior of warriors) {
        const range = target.body.isFlying ? warrior.type.rangeAir : warrior.type.rangeGround;
        const squareRange = range * range;

        if (calculateSquareDistance(warrior.body, target.body) <= squareRange) {
          let inRangeWarriors = this.targetToWarriors.get(target);
          let inRangeTargets = this.warriorToTargets.get(warrior);

          if (!inRangeWarriors) {
            inRangeWarriors = new Set();
            this.targetToWarriors.set(target, inRangeWarriors);
          }

          if (!inRangeTargets) {
            inRangeTargets = new Set();
            this.warriorToDamage.set(warrior, 0);
            this.warriorToTargets.set(warrior, inRangeTargets);
          }

          inRangeWarriors.add(warrior);
          inRangeTargets.add(target);
          this.warriorToDamage.set(warrior, this.warriorToDamage.get(warrior) + target.type.damageGround);
        }
      }
    }

    // Orders target by their damage per second
    this.targetsInRange = [...this.targetToWarriors.keys()].sort(orderTargets);
  }

  isWarriorAssigned(warrior) {
    return this.assignedWarriors.has(warrior);
  }

  // Lists the warriors in range of the given target. Orders the warriors with the least other targets first.
  listWarriorsForTargetByInRangeOtherTargets(target) {
    const warriors = this.targetToWarriors.get(target);

    if (warriors.size) {
      return [...warriors].sort((a, b) => (this.warriorToDamage.get(a) - this.warriorToDamage.get(b)));
    } else {
      return [];
    }
  }

  assign(warrior, target) {
    const fighter = this.warriorToFightJob.get(warrior);
    fighter.target = target;

    this.assignedWarriors.add(warrior);

    for (const [ally, targets] of this.warriorToTargets) {
      if (targets.has(target)) {
        targets.delete(target);
        this.warriorToDamage.set(ally, this.warriorToDamage.get(ally) - target.type.damageGround);
      }
    }

    for (const warriors of this.targetToWarriors.values()) {
      if (warriors.has(warrior)) {
        warriors.delete(warrior);
      }
    }
  }
}

function isValidTarget(target) {
  if (target.type.name === "AdeptPhaseShift") return false;

  return true;
}

function isEnemyWarriorAbleToAttack(enemy, groundWarriors) {
  if (enemy.type.rangeGround < 1) return false;

  const groundRange = enemy.type.rangeGround + enemy.body.r + 1; // Use 1 for body radius of my warriors to reduce calculations
  const squareGroundRange = groundRange * groundRange;

  for (const warrior of groundWarriors) {
    if (calculateSquareDistance(enemy.body, warrior.body) <= squareGroundRange) return true;
  }
}

function orderTargets(a, b) {
  return (b.type.damageGround / b.armor.total) - (a.type.damageGround / a.armor.total);
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
      fighter.target = getClosestVisibleTarget(warrior, matrix.primaryTargets) || getClosestVisibleTarget(warrior, battle.zone.threats);
    }
  }
}

function setKiteTargets(battle) {
  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior) {
      fighter.target = getClosestVisibleTarget(warrior, warrior.zone.threats) || getClosestVisibleTarget(warrior, battle.zone.threats);
    }
  }
}

function getClosestVisibleTarget(warrior, targets) {
  let closestTarget;
  let closestDistance = Infinity;

  for (const target of targets) {
    if (!target.isAlive || (target.lastSeen < Resources.loop)) continue;
    if (target.body.isGround && !warrior.type.damageGround) continue;
    if (target.body.isFlying && !warrior.type.damageAir) continue;
    if (!isValidTarget(target)) continue;

    const distance = calculateSquareDistance(warrior.body, target.body);

    if (distance < closestDistance) {
      closestTarget = target;
      closestDistance = distance;
    }
  }

  return closestTarget;
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
