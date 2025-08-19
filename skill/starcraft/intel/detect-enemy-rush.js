import { ActiveCount, Depot, Memory, Score, TotalCount, VisibleCount } from "./imports.js";

const WAVE_STARTER_ENEMY_ARMY_LEVEL = 0.5;
const ALERT_YELLOW = 4;
const MAX_MOVE_OUT_ARMY_VALUE = 5000;

export const ENEMY_RUSH_NOT_EXPECTED = 0;
export const ENEMY_RUSH_MODERATE_LEVEL = 1;
export const ENEMY_RUSH_HIGH_LEVEL = 2;
export const ENEMY_RUSH_EXTREME_LEVEL = 3;

// TODO: Improve this by keeping track of all enemy investments
// When enemy has lower investment in economy than us, we expect enemy rush
// When enemy has invested in warriors and warrior production, we expect enemy waves
// When enemy has invested in economy and static defense, we don't expect enemy expansion
let enemyPhotonCannons = 0;
let enemyZerglings = 0;

export default function() {
  let level = ENEMY_RUSH_NOT_EXPECTED;

  enemyPhotonCannons = Math.max(VisibleCount.PhotonCannon, enemyPhotonCannons);
  enemyZerglings = Math.max(VisibleCount.Zergling, enemyZerglings);

  if ((enemyZerglings >= 20) && !Memory.OpportunityToUseOracle) {
    console.log("Raise opportunity to use Oracle");
    Memory.OpportunityToUseOracle = true;
  }

  if ((Memory.LevelEnemyRush >= 3) && (!ActiveCount.ShieldBattery || (ActiveCount.Stalker < 3))) {
    // Extreme enemy rush is still expected
    level = ENEMY_RUSH_EXTREME_LEVEL;
  } else if ((TotalCount.Assimilator <= 1) && (!ActiveCount.ShieldBattery || (ActiveCount.Stalker < 3)) && areZerglingsApproaching()) {
    // Extreme enemy rush is now expected
    level = ENEMY_RUSH_EXTREME_LEVEL;
  } else if ((ActiveCount.Nexus === 1) && isExpectingEnemyWaves()) {
    level = ENEMY_RUSH_HIGH_LEVEL;
  } else if (Memory.FlagSiegeDefense || Memory.MilestoneMaxArmy) {
    level = ENEMY_RUSH_NOT_EXPECTED;
  } else if (Memory.DetectedEnemyProxy || Memory.DetectedEnemyHoard) {
    level = ENEMY_RUSH_HIGH_LEVEL;
  } else if (Memory.DetectedEnemyDefensiveStance || (enemyPhotonCannons > 3)) {
    // TODO: Improve this by checking enemy investments
    level = ENEMY_RUSH_NOT_EXPECTED;
  } else if (!Memory.DetectedEnemyExpansion) {
    // TODO: Add Crawler case = enemy expansion without vespene
    level = ENEMY_RUSH_HIGH_LEVEL;
  }

  if (level != Memory.LevelEnemyRush) {
    console.log("Enemy rush level changes from", Memory.LevelEnemyRush, "to", level);
    Memory.LevelEnemyRush = level;
  }
}

let fireZones;
let isInWave = false;
let valueArmyAtWaveStart = 0;
let killedValueArmyAtWaveStart = 0;
let lostValueArmyAtWaveStart = 0;
let valueArmyAtMoveOut = 0;

function isExpectingEnemyWaves() {
  if (!fireZones) {
    fireZones = [Depot.home, ...Depot.home.range.fire];
  }

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
  let enemyCount = 0;

  for (const zone of fireZones) {
    enemyCount += zone.enemies.size;
  }

  return !enemyCount;
}

function isDamageTaken() {
  for (const zone of fireZones) {
    for (const building of zone.buildings) {
      if (building.isHit) return true;
    }
    for (const warrior of zone.warriors) {
      if (warrior.isHit) return true;
    }
    for (const worker of zone.workers) {
      if (worker.isHit) return true;
    }
  }
}

function areZerglingsApproaching() {
  if (VisibleCount.Zergling < 4) return false;
  // TODO: Consider the position of the zerglings. If they are still in the enemy base, don't assume they are approaching.
  return true;
}
