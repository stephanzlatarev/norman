import { Memory, Resources } from "./imports.js";

const LOOPS_PER_SECOND = 22.4;
const LOOPS_PER_MINUTE = LOOPS_PER_SECOND * 60;
const LOOPS_FIVE_MINUTES = LOOPS_PER_MINUTE * 5;

export default function() {
  if (Memory.MilestoneBasicMilitary && !Memory.ExpectEnemyRush) return;

  const previousExpectEnemyRush = Memory.ExpectEnemyRush;
  let expectEnemyRush = false;

  if (Resources.loop > LOOPS_FIVE_MINUTES) {
    // Don't expect enemy rush after the first 5 minutes
    expectEnemyRush = false;
  } else if (Memory.MilestoneMaxArmy) {
    expectEnemyRush = false;
  } else if (Memory.DetectedEnemyProxy || Memory.DetectedEnemyHoard) {
    expectEnemyRush = true;
  } else if (Memory.DetectedEnemyDefensiveStance) {
    expectEnemyRush = false;
  } else if (!Memory.DetectedEnemyExpansion) {
    // TODO: Add Crawler case = enemy expansion without vespene
    expectEnemyRush = true;
  }

  if (expectEnemyRush != previousExpectEnemyRush) {
    console.log(expectEnemyRush ? "Expect" : "Don't expect", "enemy rush");
    Memory.ExpectEnemyRush = expectEnemyRush;
  }
}
