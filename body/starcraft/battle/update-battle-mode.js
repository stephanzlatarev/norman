import Memory from "../../../code/memory.js";
import Battle from "./battle.js";
import Depot from "../map/depot.js";
import { ALERT_YELLOW } from "../map/alert.js";

const ATTACK_BALANCE = 1.6;
const RETREAT_BALANCE = 1.0;
const DEFEND_BALANCE = 0.7;

const IS_STRONG_ENEMY = {
  Bunker: true,
  Immortal: true,
  ShieldBattery: true,
  SiegeTank: true,
  SiegeTankSieged: true,
};

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

  if (battle.zone.alertLevel <= ALERT_YELLOW) {
    // This is the case when preparing for defence or making an ambush
    mode = Battle.MODE_RALLY;
  } else if (battle.lines.length) {
    if ((Memory.DeploymentOutreach >= Memory.DeploymentOutreachFullOffense) && isPrimaryBattle(battle)) {
      mode = maxoutTransition(battle);
    } else {
      mode = normalTransition(battle);
    }
  }

  if ((mode === Battle.MODE_MARCH) && ((battle.zone.tier.level === 1) || areMarchingFightersInFireRange(battle))) {
    mode = Battle.MODE_FIGHT;
  }

  // TODO: Re-examine matches with Apidae before enabling
  // Stalkers clamped on ramp and only 2-3 were attacking while the rest couldn't reach the targets.
  // if ((mode === Battle.MODE_FIGHT) && shouldWearEnemies(battle.zone)) {
  //   mode = Battle.MODE_WEAR;
  // }

  battle.go(mode);
}

function normalTransition(battle) {
  // Check if there are fighters
  if (battle.deployedBalance <= 0) {
    return Battle.MODE_RALLY;
  }

  // Check if there's no resistence.
  if (battle.deployedBalance === Infinity) {
    return battle.enemyHealth ? Battle.MODE_SMASH : Battle.MODE_STAND;
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
    if ((battle.deployedBalance >= DEFEND_BALANCE) || (battle.zone == Depot.home) || areEnoughFightersRallied(battle)) {
      return Battle.MODE_FIGHT;
    } else {
      return Battle.MODE_RALLY;
    }
  }

  // Check if we are defending the approaches to our bases
  if (battle.zone.tier.level === 2) {
    if ((battle.deployedBalance >= RETREAT_BALANCE) || isFrontlineAtHomeBase(battle)) {
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

function isFrontlineAtHomeBase(battle) {
  for (const line of battle.lines) {
    if (line.zone === Depot.home) {
      return true;
    }
  }
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
      if (IS_STRONG_ENEMY[enemy.type.name]) return false;

      if (!enemy.type.isWorker && (enemy.type.damageGround > 0)) {
        enemyCount++;
      }
    }
  }

  return (enemyCount <= 3) && (warriorCount > enemyCount);
}

function shouldWearEnemies(zone) {
  for (const threat of zone.threats) {
    if (threat.type.movementSpeed > 0) return false;
  }

  return true;
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
