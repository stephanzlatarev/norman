import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import Wall from "../map/wall.js";

export default class WallNatural extends Mission {

  run() {
    if (!this.wall) {
      this.wall = Wall.list()[0];
    }

    if (TotalCount.Nexus < 2) {
      const keeperType = findWallKeeperType();

      if (this.job && (this.job.agent.type !== keeperType)) {
        this.job.close(true);
        this.job = null;
      }

      if (!this.job && keeperType) {
        this.job = new WallKeeper(keeperType, this.wall);
      }
    } else if (this.job) {
      this.job.close(true);
      this.job = null;
    }
  }

}

const WARRIOR_FACTORY = {
  Gateway: true,
  RoboticsFacility: true,
};

class WallKeeper extends Job {

  wall = null;

  constructor(keeperType, wall) {
    super(keeperType);

    this.wall = wall;
    this.priority = 100;
  }

  execute() {
    if (!this.assignee.isAlive) {
      this.close(false);
    } else if (this.wall.enemies.size) {
      orderHold(this.assignee, this.wall.blueprint.choke);
    } else {
      orderMove(this.assignee, this.wall.blueprint.rally);
    }

    for (const facility of Units.buildings().values()) {
      if (!facility.isActive) continue;

      if (WARRIOR_FACTORY[facility.type.name]) {
        setRallyPoint(facility, selectRallyPoint(facility, this.wall));
      }
    }
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

function selectRallyPoint(facility, wall) {
  if (facility.zone === wall) {
    const dx = Math.sign(wall.blueprint.rally.x - wall.blueprint.choke.x);
    const dy = Math.sign(wall.blueprint.rally.y - wall.blueprint.choke.y);

    return {
      x: facility.body.x + dx + dx,
      y: facility.body.y + dy + dy,
    };
  }

  return wall.blueprint.rally;
}

function orderHold(warrior, pos) {
  if (!warrior || !warrior.order || !warrior.body || !pos) return;
  if ((warrior.order.abilityId === 18) && isExactPosition(warrior.body, pos)) return;

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos).queue(18);
  }
}

function orderMove(warrior, pos) {
  if (!warrior || !warrior.order || !warrior.body || !pos) return;
  if (isSamePosition(warrior.body, pos)) return;

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos);
  }
}

function setRallyPoint(facility, rally) {
  if (!facility.rally || (facility.rally.x !== rally.x) || (facility.rally.y !== rally.y)) {
    return new Order(facility, 195, rally).accept(true);
  }
}

function isExactPosition(a, b) {
  return (Math.abs(a.x - b.x) <= 0.1) && (Math.abs(a.y - b.y) <= 0.1);
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) <= 3) && (Math.abs(a.y - b.y) <= 3);
}
