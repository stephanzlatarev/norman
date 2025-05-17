import Memory from "../../../code/memory.js";
import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Types from "../types.js";
import { ActiveCount } from "../memo/count.js";
import Depot from "../map/depot.js";

let wallKeeperJob;

export default class WallBase extends Mission {

  run() {
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
}

function shouldWallBase() {
  return Memory.ModeCombatDefend;
}

class WallKeeper extends Job {

  constructor(keeperType, wallSite) {
    super(keeperType);

    this.zone = Depot.home;
    this.priority = 100;

    this.rally = wallSite;
    this.wall = wallSite.wall[0];
  }

  execute() {
    const warrior = this.assignee;

    if (!warrior.isAlive) {
      this.close(false);
    } else if (warrior.zone.enemies.size) {
      orderHold(warrior, this.wall);
    } else {
      orderMove(warrior, this.rally);
    }
  }

  close(outcome) {
    const warrior = this.assignee;

    if (warrior && warrior.isAlive) {
      orderMove(warrior, this.rally);
    }

    super.close(outcome);
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

function orderHold(warrior, pos) {
  if (!warrior || !warrior.order || !warrior.body || !pos) return;
  if ((warrior.order.abilityId === 18) && isExactPosition(warrior.body, pos)) return;
  if ((warrior.order.abilityId === 23) && isSamePosition(warrior.body, pos)) return;

  if (!warrior.weapon.cooldown && isAttacked(warrior)) {
    new Order(warrior, 23, pos).accept(true);
  } else if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos).queue(18);
  }
}

function orderMove(warrior, pos) {
  if (!warrior || !warrior.order || !warrior.body || !pos) return;
  if (!warrior.order.abilityId && isNearPosition(warrior.body, pos)) return;

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos);
  }
}

function isAttacked(warrior) {
  for (const enemy of Depot.home.enemies) {
    if (isSamePosition(warrior.body, enemy.body)) return true;
  }
}

function isExactPosition(a, b) {
  return (Math.abs(a.x - b.x) <= 0.1) && (Math.abs(a.y - b.y) <= 0.1);
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) <= 3) && (Math.abs(a.y - b.y) <= 3);
}

function isNearPosition(a, b) {
  return (Math.abs(a.x - b.x) <= 6) && (Math.abs(a.y - b.y) <= 6);
}
