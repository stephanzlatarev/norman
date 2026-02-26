import { ActiveCount, Depot, Enemy, Memory, Score, TotalCount, Units, VisibleCount } from "./imports.js";

const WAVE_STARTER_ENEMY_ARMY_LEVEL = 0.5;
const ALERT_YELLOW = 4;
const MAX_MOVE_OUT_ARMY_VALUE = 5000;
const PERIMETER_RED = 5;
const EARLY_SCOUT_MODE_KILL = 1;

export const ENEMY_RUSH_NOT_EXPECTED = 0;
export const ENEMY_RUSH_MODERATE_LEVEL = 1;
export const ENEMY_RUSH_HIGH_LEVEL = 2;     // Enemy is expected to attack with one-base mineral-based economy
export const ENEMY_RUSH_EXTREME_LEVEL = 3;  // Enemy is expected to attack with melee units and workers before our home base is properly walled off

const REASON_NO_RED_FLAGS = "No red flags";
let levelEnemyRushChangeReason = REASON_NO_RED_FLAGS;

// TODO: Improve this by keeping track of all enemy investments
// When enemy has lower investment in economy than us, we expect enemy rush
// When enemy has invested in warriors and warrior production, we expect enemy waves
// When enemy has invested in economy and static defense, we don't expect enemy expansion
let enemyPhotonCannons = 0;
let enemyReapers = 0;
let enemyZerglings = 0;

export default function() {
  let level = ENEMY_RUSH_NOT_EXPECTED;
  let reason = REASON_NO_RED_FLAGS;

  enemyPhotonCannons = Math.max(VisibleCount.PhotonCannon, enemyPhotonCannons);
  enemyReapers = Math.max(VisibleCount.Reaper, enemyReapers);
  enemyZerglings = Math.max(VisibleCount.Zergling, enemyZerglings);

  if ((enemyZerglings >= 20) && !Memory.OpportunityToUseOracle) {
    console.log("Raise opportunity to use Oracle");
    Memory.OpportunityToUseOracle = true;
  }

  if (Memory.MilestoneMaxArmy) {
    reason = "Army is maxed out";
    level = ENEMY_RUSH_NOT_EXPECTED;
  } else if (canDefendHomeBaseUnderSiege()) {
    reason = "Army can defend siege of home base";
    level = ENEMY_RUSH_NOT_EXPECTED;
  } else if (isEnemyExpandingHarvestPerimeter()) {
    // Lower the expected enemy rush level
    reason = "Enemy is expanding its harvest perimeter";
    level = (Memory.LevelEnemyRush >= ENEMY_RUSH_MODERATE_LEVEL) ? ENEMY_RUSH_MODERATE_LEVEL : ENEMY_RUSH_NOT_EXPECTED;
  } else if (isEnemyDefending()) {
    // Lower the expected enemy rush level
    reason = "Enemy is building defenses";
    level = (Memory.LevelEnemyRush >= ENEMY_RUSH_MODERATE_LEVEL) ? ENEMY_RUSH_MODERATE_LEVEL : ENEMY_RUSH_NOT_EXPECTED;
  } else if (Memory.LevelEnemyRush === ENEMY_RUSH_EXTREME_LEVEL) {
    // Extreme enemy rush is still expected
    reason = levelEnemyRushChangeReason;
    level = ENEMY_RUSH_EXTREME_LEVEL;
  } else if (Memory.EarlyScoutKills && (Memory.EarlyScoutMode === EARLY_SCOUT_MODE_KILL)) {
    // Early scout is killing enemy workers. This damages enemy economy but makes us blind to enemy rushes. Prepare for extreme rush just in case.
    reason = "Early scout is busy killing workers and not scouting";
    level = ENEMY_RUSH_EXTREME_LEVEL;
  } else if (Memory.FlagEnemyProxyNexus) {
    reason = "Expecting strategic recall rush with workers and zealots";
    level = ENEMY_RUSH_EXTREME_LEVEL;
  } else if (Memory.FlagEnemyProxyWarriorProduction) {
    reason = "Expecting proxy gateway rush with zealots or barracks rush with marines";
    level = ENEMY_RUSH_EXTREME_LEVEL;
  } else if ((TotalCount.Assimilator <= 1) && (!ActiveCount.ShieldBattery || (ActiveCount.Stalker < 3)) && areZerglingsApproaching()) {
    reason = "Expecting very early rush with zerglings";
    level = ENEMY_RUSH_EXTREME_LEVEL;
  } else if (Memory.LevelEnemyRush === ENEMY_RUSH_HIGH_LEVEL) {
    // High enemy rush is still expected
    reason = levelEnemyRushChangeReason;
    level = ENEMY_RUSH_HIGH_LEVEL;
  } else if (enemyReapers >= 2) {
    // Reapers can jump in my home base so walling it off is not effective. They remove the threat of a rush.
    reason = "Expecting attacks from reapers";
    level = ENEMY_RUSH_NOT_EXPECTED;
  } else if (enemyPhotonCannons > 1) {
    // Photon Cannons are a big investment. They remove the threat of a rush that can be defended with static defense.
    if (arePhotonCannonsClose()) {
      reason = "Expecting rush with photon cannons";
      level = ENEMY_RUSH_HIGH_LEVEL;
    } else {
      reason = "Enemy is building defenses with photon cannons";
      level = ENEMY_RUSH_NOT_EXPECTED;
    }
  } else if ((ActiveCount.Nexus === 1) && isExpectingEnemyWaves()) {
    // Enemy rush on one-base economy is expected. If we're already expecting harder rush then don't lower the level.
    reason = "Expecting enemy waves from one-base economy";
    level = Math.max(ENEMY_RUSH_MODERATE_LEVEL, Memory.LevelEnemyRush);
  } else if (Memory.DetectedEnemyProxy) {
    reason = "Detected enemy proxy";
    level = ENEMY_RUSH_HIGH_LEVEL;
  } else if (Memory.DetectedEnemyHoard) {
    reason = "Expecting enemy hoard";
    level = ENEMY_RUSH_HIGH_LEVEL;
  } else if (!Memory.DetectedEnemyExpansion && ((TotalCount.Nexus > 1) || Memory.FlagHarvesterCapacity)) {
    // TODO: Add Crawler case = enemy expansion without vespene
    reason = "Enemy is on one base";
    level = ENEMY_RUSH_MODERATE_LEVEL;
  }

  if ((level != Memory.LevelEnemyRush) || (reason !== levelEnemyRushChangeReason)) {
    console.log("Enemy rush level changes from", Memory.LevelEnemyRush, "to", level, "due to:", reason);
    Memory.LevelEnemyRush = level;
    levelEnemyRushChangeReason = reason;
  }
}

let enemyDefense;

function canDefendHomeBaseUnderSiege() {
  // Check if we have enough army to defend under siege
  if (!Memory.FlagSiegeDefense) return false;

  // Check if we're still under siege. If enemy in sight is still strong, assume enemy rush continues.
  if (Memory.LevelEnemyArmySuperiority >= 0.5) return false;

  // Check if we already fought under siege. If there were lots of casualties and there's no evidence for enemy expanding its economy, assume strong enemy rush continues.
  if ((Score.killedValueArmy > 800) && !isEnemyExpandingHarvestPerimeter()) return false;

  return true;
}

function isEnemyDefending() {
  if (enemyDefense) return true;

  if (isEnemyStructureDefensive("Bunker", VisibleCount.Bunker)) {
    console.log("Detected enemy defensive stance: Bunker");
    enemyDefense = true;
  } else if (isEnemyStructureDefensive("PhotonCannon", VisibleCount.PhotonCannon)) {
    console.log("Detected enemy defensive stance: Photon Cannon");
    enemyDefense = true;
  }

  return enemyDefense;
}

let enemyExpandingHarvestPerimeter = false;

function isEnemyExpandingHarvestPerimeter() {
  if (enemyExpandingHarvestPerimeter) return true;

  for (const unit of Units.enemies().values()) {
    if (unit.isCarryingMinerals && (unit.zone !== Enemy.base) && isEnemyBase(unit.zone)) {
      console.log("Detected enemy harvests expansion:", unit.zone.name);
      enemyExpandingHarvestPerimeter = true;
      break;
    }
  }

  return enemyExpandingHarvestPerimeter;
}

function isEnemyBase(zone) {
  if (!zone) return false;
  if (!zone.isDepot) return false;

  for (const sector of zone.sectors) {
    for (const building of sector.threats) {
      if (building.zone !== zone) continue;
      if (building.type.isDepot) return true;
    }
  }

  return false;
}

function isEnemyStructureDefensive(type, count) {
  if (!count) return false;

  for (const unit of Units.enemies().values()) {
    if (!unit.zone) continue;
    if ((unit.type.name === type) && (unit.zone.permieterLevel >= PERIMETER_RED)) return true;
  }

  return false;
}

let isInWave = false;
let valueArmyAtWaveStart = 0;
let killedValueArmyAtWaveStart = 0;
let lostValueArmyAtWaveStart = 0;
let valueArmyAtMoveOut = 0;

function isExpectingEnemyWaves() {
  if (isInWave) {
    const enemyArmyValue = Score.killedValueArmy - killedValueArmyAtWaveStart;

    // Expect next wave to be stronger than the previous one and add some value on top so that our army is even stronger
    // If the enemy army is extra strong early in the game, their economy is military focused and next wave may be stronger than usual.
    valueArmyAtMoveOut = Math.min((enemyArmyValue > 1000) ? enemyArmyValue * 4 : enemyArmyValue * 2, MAX_MOVE_OUT_ARMY_VALUE);

    if (didWaveEnd()) {
      isInWave = false;

      console.log("Enemy wave ended.",
        "Own losses:", (Score.lostValueArmy - lostValueArmyAtWaveStart),
        "Enemy losses:", enemyArmyValue,
        "Move out army value:", valueArmyAtMoveOut
      );
    }
  } else if (didWaveStart()) {
    isInWave = true;

    valueArmyAtWaveStart = Score.currentValueArmy;
    valueArmyAtMoveOut = Math.min(valueArmyAtWaveStart * 2, MAX_MOVE_OUT_ARMY_VALUE);
    killedValueArmyAtWaveStart = Score.killedValueArmy;
    lostValueArmyAtWaveStart = Score.lostValueArmy;

    console.log("Enemy wave started.");
  }

  return (Score.currentValueArmy < valueArmyAtMoveOut);
}

function didWaveStart() {
  if (
    (Memory.LevelEnemyArmySuperiority > WAVE_STARTER_ENEMY_ARMY_LEVEL) ||
    (Depot.home.alertLevel >= ALERT_YELLOW)
  ) {
    return isDamageTaken();
  }
}

function didWaveEnd() {
  for (const sector of Depot.home.horizon) {
    for (const enemy of sector.enemies) {
      if (enemy.type.damageGround) {
        return false;
      }
    }
  }

  return true;
}

function isDamageTaken() {
  for (const sector of Depot.home.horizon) {
    for (const building of sector.buildings) {
      if (building.isHit) return true;
    }
    for (const warrior of sector.warriors) {
      if (warrior.isHit) return true;
    }
    for (const worker of sector.workers) {
      if (worker.isHit) return true;
    }
  }
}

function areZerglingsApproaching() {
  if (VisibleCount.Zergling < 4) return false;
  // TODO: Consider the position of the zerglings. If they are still in the enemy base, don't assume they are approaching.
  return true;
}

function arePhotonCannonsClose() {
  for (const sector of Depot.home.horizon) {
    for (const enemy of sector.threats) {
      if (enemy.type.name === "PhotonCannon") {
        return true;
      }
    }
  }
}
