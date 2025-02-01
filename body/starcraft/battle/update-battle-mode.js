import Battle from "../battle/battle.js";
import Resources from "../memo/resources.js";

const ATTACK_BALANCE = 1.6;
const RETREAT_BALANCE = 1.0;
const DEFEND_BALANCE = 0.7;

/*
Battles start in WATCH mode. When there are no battle lines they go back to WATCH mode.

# While building the army
While battle balance is not sufficient for attacking, the battle is in RALLY mode.
When battle balance becomes sufficient for attacking, the battle transitions from RALLY to MARCH mode.
When fighters reach fire range, the battle transitions from MARCH to FIGHT/SMASH mode.
When battle balance falls below the retreat level, the battle transitions to RALLY mode.

# When the army is complete
The primary battle will start attacking as soon as the majority of fighters are in the battle zones.
The other battles will behave as while building the army.
*/
export default function(battle) {
  let mode = Battle.MODE_WATCH;

  if (battle.lines.length) {
    if (isArmyComplete() && isPrimaryBattle(battle)) {
      mode = maxoutTransition(battle);
    } else {
      mode = normalTransition(battle);
    }
  }

  if ((mode === Battle.MODE_MARCH) && areMarchingFightersInFireRange(battle)) {
    mode = Battle.MODE_FIGHT;
  }

  battle.go(mode);
}

function normalTransition(battle) {
  // Check if there are fighters
  if (battle.deployedBalance <= 0) {
    return Battle.MODE_RALLY;
  }

  // Check if there's no resistence.
  if (battle.deployedBalance === Infinity) {
    return Battle.MODE_SMASH;
  }

  // Check if the balance is enough for attacking
  if (battle.deployedBalance >= ATTACK_BALANCE) {
    return (battle.mode === Battle.MODE_FIGHT) ? Battle.MODE_FIGHT : Battle.MODE_MARCH;
  }

  // Check if this is a fight between small number of warriors, where balance numbers are not exact
  if (isSmallFight(battle)) {
    return (battle.mode === Battle.MODE_FIGHT) ? Battle.MODE_FIGHT : Battle.MODE_MARCH;
  }

  // Check if we are defending our bases
  if (battle.zone.tier.level === 1) {
    if ((battle.deployedBalance >= DEFEND_BALANCE) || areEnoughFightersRallied(battle)) {
      return Battle.MODE_FIGHT;
    } else {
      return Battle.MODE_RALLY;
    }
  }

  // Check if we are defending the approaches to our bases
  if (battle.zone.tier.level === 2) {
    if (battle.deployedBalance >= DEFEND_BALANCE) {
      return Battle.MODE_FIGHT;
    } else {
      return Battle.MODE_RALLY;
    }
  }

  // Check if we're already attacking and should not yet retreat
  if ((battle.mode === Battle.MODE_FIGHT) && (battle.deployedBalance >= RETREAT_BALANCE)) {
    return Battle.MODE_FIGHT;
  }

  return Battle.MODE_RALLY;
}

function maxoutTransition(battle) {
  // Check if there are fighters
  if (battle.deployedBalance <= 0) {
    return Battle.MODE_RALLY;
  }

  // Check if there's no resistence.
  if (battle.deployedBalance === Infinity) {
    return Battle.MODE_SMASH;
  }

  // Check if the balance is enough for attacking
  if (battle.deployedBalance >= ATTACK_BALANCE) {
    return Battle.MODE_FIGHT;
  }

  // Check if we're already attacking and should not yet retreat
  if ((battle.mode === Battle.MODE_FIGHT) && (battle.deployedBalance >= RETREAT_BALANCE)) {
    return Battle.MODE_FIGHT;
  }

  // Check if enough fighters are rallied
  if (areEnoughFightersRallied(battle)) {
    return Battle.MODE_FIGHT;
  }

  return Battle.MODE_RALLY;
}

function isArmyComplete() {
  return (Resources.supplyUsed > 190);
}

function isPrimaryBattle() {
  return true;
}

function areEnoughFightersRallied(battle) {
  let deployed = 0;
  let rallying = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive) {
      if (battle.zones.has(warrior.zone)) {
        deployed++;
      } else {
        rallying++;
      }
    }
  }

  // TODO: Check for capacity of zone (now hardcoded to 20).
  // If deployed fighters are more than that count units rallied to neighbor zones as deployed
  return (deployed > 20) || (deployed > rallying * 4);
}

function isSmallFight(battle) {
  let warriorCount = 0;
  let enemyCount = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive && battle.zones.has(warrior.zone)) {
      warriorCount++;
    }
  }

  for (const one of battle.zones) {
    for (const enemy of one.threats) {
      if (!enemy.type.isWorker && (enemy.type.damageGround > 0)) {
        enemyCount++;
      }
    }
  }

  return (enemyCount <= 3) && (warriorCount > enemyCount);
}

// TODO: Use target matrix for battle
function areMarchingFightersInFireRange(battle) {
  let enemies;

  for (const fighter of battle.fighters) {
    if (!fighter.assignee) continue;
    if (!fighter.marching) continue;

    const warrior = fighter.assignee;

    if (!enemies) enemies = getGroundHittingEnemiesOrDummies(battle);

    for (const enemy of enemies) {
      if (isInFireRange(warrior, enemy)) {
        return true;
      }
    }
  }

  return false;
}

function getGroundHittingEnemiesOrDummies(battle) {
  const hitters = new Set();
  const dummies = new Set();

  for (const zone of battle.zones) {
    for (const threat of zone.threats) {
      if (threat.type.damageGround) {
        hitters.add(threat);
      } else {
        dummies.add(threat);
      }
    }
  }

  return hitters.size ? hitters : dummies;
}

function isInFireRange(warrior, enemy) {
  const squareDistance = calculateSquareDistance(warrior.body, enemy.body);

  if (getSquareGroundRange(warrior) >= squareDistance) return true;
  if (getSquareGroundRange(enemy) * enemy.type.rangeGround >= squareDistance) return true;
}

function getSquareGroundRange(unit) {
  if (unit.type.rangeGround >= 3) return unit.type.rangeGround * unit.type.rangeGround;
  if (unit.type.rangeGround < 3) return 9;
  return -Infinity;
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
