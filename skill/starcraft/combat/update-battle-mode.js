import { Memory, Depot } from "./imports.js";
import { ALERT_YELLOW, PERIMETER_BLUE, PERIMETER_GREEN, PERIMETER_WHITE } from "./imports.js";
import Battle from "./battle.js";

const ATTACK_BALANCE = 1.6;
const RETREAT_BALANCE = 1.0;
const DEFEND_BALANCE = 0.7;
const STAND_BALANCE = 0.3;

/*
Battles start in WATCH mode.

# While building the army
While battle balance is not sufficient for attacking, the battle is in RALLY mode.
When battle balance becomes sufficient for attacking, the battle transitions from RALLY to MARCH mode.
When fighters reach fire range, the battle transitions from MARCH to FIGHT mode.
When battle balance falls below the retreat level, the battle transitions to RALLY mode.

# When the army is complete
The focus battle will start attacking as soon as the majority of fighters are in the battle zones.
The other battles will behave as while building the army.
*/
export default function(battle) {
  let mode = Battle.MODE_WATCH;

  if (battle.isMissionBattle) {
    mode = Battle.MODE_SMASH;
  } else if ((Memory.DeploymentOutreach >= Memory.DeploymentOutreachFullOffense) && battle.isFocusBattle) {
    mode = maxoutTransition(battle);
  } else if ((Memory.DeploymentOutreach < Memory.DeploymentOutreachNormalOffense) && (battle.front.alertLevel <= ALERT_YELLOW)) {
    // This is the case when preparing for defence or making an ambush
    mode = Battle.MODE_RALLY;
  } else {
    mode = normalTransition(battle);
  }

  if ((mode === Battle.MODE_MARCH) && ((battle.front.perimeterLevel <= PERIMETER_BLUE) || areMarchingFightersInFireRange(battle))) {
    mode = Battle.MODE_FIGHT;
  }

  // TODO: Re-examine matches with Apidae before enabling
  // Stalkers clamped on ramp and only 2-3 were attacking while the rest couldn't reach the targets.
  // if ((mode === Battle.MODE_FIGHT) && shouldWearEnemies(battle.front)) {
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

  // Check if this is a fight between small number of warriors, where balance numbers are not exact
  if (battle.isSmallBattle && areWarriorsMoreThanEnemies(battle)) {
    return Battle.MODE_FIGHT;
  }

  // Check if we are defending our bases
  if (areStandingOurGround(battle)) {
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
  if (areEnoughFightersRallied(battle, 20, 4)) {
    return Battle.MODE_FIGHT;
  }

  return Battle.MODE_RALLY;
}

function areEnoughFightersRallied(battle, count, ratio) {
  let deployed = 0;
  let rallying = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive) {
      if (battle.sectors.has(warrior.sector)) {
        deployed++;
      } else {
        rallying++;
      }
    }
  }

  // TODO: Check for capacity of zone (now hardcoded to 20).
  // If deployed fighters are more than that count units rallied to neighbor zones as deployed
  return (deployed > count) || (deployed > rallying * ratio);
}

function areStandingOurGround(battle) {
  const ground = battle.rally;

  // Check if this is our ground
  if (ground.perimeterLevel >= PERIMETER_WHITE) return false;

  // We need warriors to fight
  if (battle.deployedBalance < STAND_BALANCE) return false;
  if (battle.deployedBalance >= RETREAT_BALANCE) return true;

  // Always defend the home base
  if (ground === Depot.home) return true;

  // We need at least some advantage when defending and active depot zone
  if (ground.depot && (ground.workers.size >= 4)) {
    if (battle.deployedBalance >= DEFEND_BALANCE) {
      if (hasShieldBattery(ground)) return true;
      if (areEnoughFightersRallied(battle, 12, 4)) return true;
    }

    // We desperately defend the natural
    if (Depot.home.neighbors.has(ground)) {
      if (hasShieldBattery(ground)) return true;
    }
  }

  return false;
}

function hasShieldBattery(zone) {
  for (const building of zone.buildings) {
    if (building.isActive && building.energy && (building.type.name === "ShieldBattery")) {
      return true;
    }
  }
}

function areWarriorsMoreThanEnemies(battle) {
  let warriorCount = 0;
  let enemyCount = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive && battle.sectors.has(warrior.sector)) {
      warriorCount++;
    }
  }

  for (const sector of battle.sectors) {
    for (const enemy of sector.threats) {
      if (!enemy.type.isWorker && (enemy.type.damageGround > 0)) {
        enemyCount++;
      }
    }
  }

  return (warriorCount > enemyCount);
}

// TODO: Use target matrix for battle
function areMarchingFightersInFireRange(battle) {
  let enemies;

  for (const fighter of battle.fighters) {
    if (!fighter.assignee) continue;

    // TODO: Check this again. It interfered with Fighter job shouldAttack check and kept warriors idle in enemy fire range
    // if (!fighter.marching) continue;

    const warrior = fighter.assignee;

    if (fighter.target && isInFireRange(warrior, fighter.target)) return true;

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

  for (const sector of battle.sectors) {
    for (const threat of sector.threats) {
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
