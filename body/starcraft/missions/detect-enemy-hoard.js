import Memory from "../../../code/memory.js";
import Mission from "../mission.js";
import Zone from "../map/zone.js";
import Resources from "../memo/resources.js";
import { ActiveCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";

export default class DetectEnemyHoardMission extends Mission {

  run() {
    if (Memory.MilestoneBasicMilitary) return;
    if (Memory.DetectedEnemyHoard) return;

    if (isEarlySpawningPool()) {
      console.log("Enemy hoarding detected: early spawing pool.");
      Memory.DetectedEnemyHoard = true;
    } else if (isEarlyZergling()) {
      console.log("Enemy hoarding detected: early zergling.");
      Memory.DetectedEnemyHoard = true;
    } else if (isEnemyHoardingProduction()) {
      console.log("Enemy hoarding detected: production.");
      Memory.DetectedEnemyHoard = true;
    } else if (isEnemyHoardingWarriors()) {
      console.log("Enemy hoarding detected: warriors.");
      Memory.DetectedEnemyHoard = true;
    }
  }

}

const IS_PRODUCING_WARRIORS = { Barracks: 1, Gateway: 1 };

let detectedEarlySpawningPool = false;
let detectedEarlyZergling = false;

function isEarlySpawningPool() {
  if (Resources.loop > 3000) return false;

  if (detectedEarlySpawningPool) {
    return true;
  } else if (VisibleCount.SpawningPool && !ActiveCount.Zealot && !ActiveCount.Stalker) {
    detectedEarlySpawningPool = true;
    return true;
  }
}

function isEarlyZergling() {
  if (Resources.loop > 3000) return false;

  if (detectedEarlyZergling) {
    return true;
  } else if (VisibleCount.Zergling && !ActiveCount.Zealot && !ActiveCount.Stalker) {
    detectedEarlyZergling = true;
    return true;
  }
}

function isEnemyHoardingProduction() {
  const MIN_COUNT = Math.max(1, ActiveCount.Gateway + ActiveCount.RoboticsFacility);

  let count = 0;

  for (const zone of Zone.list()) {
    for (const threat of zone.threats) {
      if (IS_PRODUCING_WARRIORS[threat.type.name]) {
        count++;
      }
    }
  }

  return (count > MIN_COUNT);
}

function isEnemyHoardingWarriors() {
  const MIN_SUPPLY = Math.max(5,
    ActiveCount.Colossus * 6 +
    ActiveCount.Immortal * 4 +
    ActiveCount.Stalker * 2 +
    ActiveCount.Sentry * 2 +
    ActiveCount.Zealot * 2
  );

  let supply = 0;

  for (const zone of Zone.list()) {
    for (const threat of zone.threats) {
      if (threat.type.isWarrior && !threat.type.isWorker) {
        supply += threat.type.foodRequired;
      }
    }
  }

  return (supply > MIN_SUPPLY);
}
