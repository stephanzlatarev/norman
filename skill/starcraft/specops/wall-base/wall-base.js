import { ActiveCount, Battle, Depot, Memory, Types } from "../imports.js";
import WallFielder from "./wall-fielder.js";
import WallKeeper from "./wall-keeper.js";
import calculateRampVisionLevels from "./ramp-vision.js";

let wallSite;
let wallFielderJob;
let wallKeeperJob;

export default function() {
  if (!Depot.home) return;

  if (!wallSite) {
    wallSite = Depot.home.sites.find(site => site.isWall);

    if (wallSite) {
      calculateRampVisionLevels(wallSite);
    }
  }

  if (wallSite) {
    maintainWallKeeperJob();
    maintainWallFielderJob();
  }
}

function shouldWallBase() {
  if (!Memory.ModeCombatDefend) return false;
  if (Memory.FlagSecureAntreZone) return false;
  if (Memory.FlagEnemyProxyNexus) return false;

  // Wall the base only if the battle frontline is the home base
  for (const battle of Battle.list()) {
    if (battle.zone !== Depot.home) return false;
    if (battle.front.size !== 1) return false;
    if (!battle.front.has(Depot.home)) return false;
  }

  return true;
}

function findWallKeeperType() {
  if (ActiveCount.Immortal) {
    return Types.unit("Immortal");
  } else if (ActiveCount.Zealot) {
    return Types.unit("Zealot");
  } else if (ActiveCount.Stalker) {
    return Types.unit("Stalker");
  }
}

function maintainWallKeeperJob() {
  if (wallKeeperJob) {
    if (!shouldWallBase()) {
      wallKeeperJob.close(true);
      wallKeeperJob = null;
      return;
    } else if (wallKeeperJob.isDone || wallKeeperJob.isFailed) {
      wallKeeperJob = null;
    } else {
      return;
    }
  }

  if (shouldWallBase()) {
    const keeperType = findWallKeeperType();

    if (keeperType) {
      wallKeeperJob = new WallKeeper(keeperType, wallSite);
    }
  }
}

function maintainWallFielderJob() {
  if (wallFielderJob) {
    if (!shouldWallBase()) {
      wallFielderJob.close(true);
      wallFielderJob = null;
      return;
    } else if (wallFielderJob.isDone || wallFielderJob.isFailed) {
      wallFielderJob = null;
    } else {
      return;
    }
  }

  if (shouldWallBase()) {
    wallFielderJob = new WallFielder(wallSite);
  }
}
