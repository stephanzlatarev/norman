import { ActiveCount, Depot, Memory, Types } from "../imports.js";
import WallKeeper from "./wall-keeper.js";

let wallKeeperJob;

export default function() {
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

  if (!Depot.home) return;
  if (!shouldWallBase()) return;

  const keeperType = findWallKeeperType();
  const wallSite = Depot.home.sites.find(site => site.isWall);

  if (wallSite && keeperType) {
    wallKeeperJob = new WallKeeper(keeperType, wallSite);
  }
}

function shouldWallBase() {
  return Memory.ModeCombatDefend;
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
