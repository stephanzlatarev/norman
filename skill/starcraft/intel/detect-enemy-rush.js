import { Memory } from "./imports.js";

export default function() {
  let expectEnemyRush = false;

  if (Memory.FlagSiegeDefense || Memory.MilestoneMaxArmy) {
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
