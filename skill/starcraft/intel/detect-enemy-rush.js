import { Memory, Resources } from "./imports.js";

const LOOPS_PER_SECOND = 22.4;
const LOOPS_PER_MINUTE = LOOPS_PER_SECOND * 60;
const LOOPS_FIVE_MINUTES = LOOPS_PER_MINUTE * 5;

export default function() {
  if (Memory.MilestoneBasicMilitary && !Memory.ExpectEnemyRush) return;

  if (Resources.loop > LOOPS_FIVE_MINUTES) {
    // Don't expect enemy rush after the first 5 minutes
    Memory.ExpectEnemyRush = false;
  } else if (Memory.MilestoneMaxArmy) {
    Memory.ExpectEnemyRush = false;
  } else if (Memory.DetectedEnemyProxy || Memory.DetectedEnemyHoard) {
    Memory.ExpectEnemyRush = true;
  } else if (!Memory.DetectedEnemyExpansion) {
    // TODO: Add Crawler case = enemy expansion without vespene
    Memory.ExpectEnemyRush = true;
  } else {
    Memory.ExpectEnemyRush = false;
  }
}
