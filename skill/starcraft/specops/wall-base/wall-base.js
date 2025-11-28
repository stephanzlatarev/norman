import { ActiveCount, Battle, Depot, Memory, Types } from "../imports.js";
import WallFielder from "./wall-fielder.js";
import WallKeeper from "./wall-keeper.js";
import WallShielder from "./wall-shielder.js";
import calculateRampVisionLevels from "./ramp-vision.js";

let wallSite;
let wallFielderJob;
let wallKeeperJob;
let wallShielderJobs = new Set();

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
    maintainWallShielderJobs();
  }
}

function shouldWallBase() {
  if (Memory.DeploymentOutreach > Memory.DeploymentOutreachNormalDefense) return false;
  if (Memory.FlagEnemyProxyNexus) return false;

  // Wall the base only if the only battle is at the home base
  for (const battle of Battle.list()) {
    if (battle.front !== Depot.home) return false;
    if (battle.rally !== Depot.home) return false;
  }

  return true;
}


function shouldShieldWall() {
  if (!wallKeeperJob) return false;

  for (const enemy of Depot.home.enemies.values()) {
    if (enemy.type.rangeGround < 1) return true;
  }
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

function maintainWallShielderJobs() {
  if (shouldShieldWall()) {
    let addShielder = !wallShielderJobs.size;

    for (const job of wallShielderJobs) {
      if (job.isDone || job.isFailed) {
        wallShielderJobs.delete(job);

        addShielder = true;
      } else if (job.isRequestingBackup && (wallShielderJobs.size < 2)) {
        addShielder = true;
      }
    }

    if (addShielder) {
      wallShielderJobs.add(new WallShielder(wallSite));
    }
  } else {
    for (const job of wallShielderJobs) {
      job.close(true);
    }

    wallShielderJobs.clear();
  }
}
