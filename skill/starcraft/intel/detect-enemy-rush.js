import { ActiveCount, Depot, Memory, Score, TotalCount, VisibleCount } from "./imports.js";

const LOOPS_PER_SECOND = 22.4;
const LOOPS_PER_MINUTE = LOOPS_PER_SECOND * 60;

export const ENEMY_RUSH_NOT_EXPECTED = 0;
export const ENEMY_RUSH_MODERATE_LEVEL = 1;
export const ENEMY_RUSH_HIGH_LEVEL = 2;
export const ENEMY_RUSH_EXTREME_LEVEL = 3;

// TODO: Improve this by keeping track of all enemy investments
// When enemy has lower investment in economy than us, we expect enemy rush
// When enemy has invested in warriors and warrior production, we expect enemy waves
// When enemy has invested in economy and static defense, we don't expect enemy expansion
let enemyPhotonCannons = 0;

export default function() {
  let level = ENEMY_RUSH_NOT_EXPECTED;

  enemyPhotonCannons = Math.max(VisibleCount.PhotonCannon, enemyPhotonCannons);

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
    console.log("Enemy rush level:", Memory.LevelEnemyRush);
    Memory.LevelEnemyRush = level;
  }
}

let fireZones;
let isInWave = false;
let valueArmyAtWaveStart = 0;
let killedValueArmyAtWaveStart = 0;
let lostValueArmyAtWaveStart = 0;
let valueArmyAtMoveOut = 0;
let loopsWithoutDamageTaken = 0;

function isExpectingEnemyWaves() {
  if (!fireZones) {
    fireZones = [Depot.home, ...Depot.home.range.fire];
  }

  if (isInWave) {
    if (didWaveEnd()) {
      const enemyArmyValue = Score.killedValueArmy - killedValueArmyAtWaveStart;
      const lost = Score.lostValueArmy - lostValueArmyAtWaveStart;

      // Expect next wave to be 50% stronger than the previous one
      // Then add 20% on top to have stronger army before moving out
      valueArmyAtMoveOut = enemyArmyValue * 1.5 * 1.2;
      isInWave = false;

      console.log("Enemy wave ended.", "Own losses:", lost, "Enemy losses:", enemyArmyValue);
    } else {
      if (isDamageTaken()) {
        loopsWithoutDamageTaken = 0;
      } else {
        loopsWithoutDamageTaken++;
      }

      if (loopsWithoutDamageTaken > LOOPS_PER_MINUTE) {
        // No enemy attacks for a minute. Ready to move out
        isInWave = false;

        console.log("Enemy wave ended. No damage taken for a minute.");
        return false;
      }
    }
  } else if (didWaveStart()) {
    isInWave = true;

    valueArmyAtWaveStart = Score.currentValueArmy;
    valueArmyAtMoveOut = valueArmyAtWaveStart * 1.5 * 1.2;
    killedValueArmyAtWaveStart = Score.killedValueArmy;
    lostValueArmyAtWaveStart = Score.lostValueArmy;
    loopsWithoutDamageTaken = 0;

    console.log("Enemy wave started.");
  } else if (Score.currentValueArmy > valueArmyAtMoveOut) {
    // We have enough army to move out
    return false;
  }

  return true;
}

function didWaveStart() {
  return Memory.EnemyArmyIsSuperior && isDamageTaken();
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
