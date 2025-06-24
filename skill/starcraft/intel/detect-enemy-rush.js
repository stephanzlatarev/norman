import { ActiveCount, Depot, Memory, Score } from "./imports.js";

const LOOPS_PER_SECOND = 22.4;
const LOOPS_PER_MINUTE = LOOPS_PER_SECOND * 60;

export default function() {
  let expectEnemyRush = false;

  if ((ActiveCount.Nexus === 1) && isExpectingEnemyWaves()) {
    expectEnemyRush = true;
  } else if (Memory.FlagSiegeDefense || Memory.MilestoneMaxArmy) {
    expectEnemyRush = false;
  } else if (Memory.DetectedEnemyProxy || Memory.DetectedEnemyHoard) {
    expectEnemyRush = true;
  } else if (Memory.DetectedEnemyDefensiveStance) {
    expectEnemyRush = false;
  } else if (!Memory.DetectedEnemyExpansion) {
    // TODO: Add Crawler case = enemy expansion without vespene
    expectEnemyRush = true;
  }

  if (expectEnemyRush != Memory.ExpectEnemyRush) {
    console.log(expectEnemyRush ? "Expect" : "Don't expect", "enemy rush");
    Memory.ExpectEnemyRush = expectEnemyRush;
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

    valueArmyAtWaveStart = Score.currrentValueArmy;
    valueArmyAtMoveOut = valueArmyAtWaveStart * 1.5 * 1.2;
    killedValueArmyAtWaveStart = Score.killedValueArmy;
    lostValueArmyAtWaveStart = Score.lostValueArmy;
    loopsWithoutDamageTaken = 0;

    console.log("Enemy wave started.");
  } else if (Score.currrentValueArmy > valueArmyAtMoveOut) {
    // We have enough army to move out
    return false;
  }

  return true;
}

function didWaveStart() {
  return isDamageTaken();
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
