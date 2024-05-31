import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";
import { ActiveCount } from "../memo/count.js";
import Wall from "../map/wall.js";

const MODE_DEFEND = 1;
const MODE_READY = 2;
const MODE_OFF = 3;

const WARRIOR_FACTORY = {
  Gateway: true,
  RoboticsFacility: true,
};

let mode;
let wall;
let field;
let wallKeeperJob;
const defenderJobs = new Set();

export default class WallNatural extends Mission {

  run() {
    if (mode === MODE_OFF) return;
    if (!wall && !findWallAndField()) return this.close();

    mode = field.enemies.size ? MODE_DEFEND : MODE_READY;

    if ((ActiveCount.Immortal > 1) && (mode === MODE_READY)) {
      return this.close();
    }

    maintainWallKeeperJob();
    maintainDefenderJobs();
    maintainRallyPoints();
  }

  close() {
    console.log("Mission 'Wall natural' is over.");
    mode = MODE_OFF;

    if (wallKeeperJob) {
      wallKeeperJob.close(true);
    }

    for (const defenderJob of defenderJobs) {
      defenderJob.close(true);
    }
  }

}

class WallKeeper extends Job {

  constructor(keeperType) {
    super(keeperType);

    this.priority = 100;
  }

  execute() {
    if (!this.assignee.isAlive) {
      this.close(false);
    } else if (mode === MODE_DEFEND) {
      orderHold(this.assignee, wall.blueprint.choke);
    } else {
      orderMove(this.assignee, wall.blueprint.rally);
    }
  }
}

class WallDefender extends Job {

  constructor(warrior) {
    super(warrior);

    this.priority = 99;
    this.assign(warrior);
  }

  execute() {
    const defender = this.assignee;
    const squareRange = defender.type.rangeGround * defender.type.rangeGround;

    if (defender.weapon.cooldown) {
      if (defender.order.abilityId !== 23) {
        new Order(defender, 23, wall.blueprint.choke).accept(true);
      }

      return;
    }

    let target;
    for (const enemy of field.enemies) {
      if (!enemy.body.isGround) continue;
      if (enemy.armor.health + enemy.armor.shield < 0) continue;
      if (squareDistance(defender.body, enemy.body) > squareRange) continue;

      if (!target || (enemy.armor.health + enemy.armor.shield < target.armor.health + target.armor.shield)) {
        target = enemy;
      }
    }
    if (target) {
      target.armor.health -= defender.type.damageGround;

      return orderAttack(defender, target);
    }

    if (defender.order.abilityId !== 23) {
      new Order(defender, 23, wall.blueprint.choke).accept(true);
    }
  }

}

function findWallAndField() {
  const walls = Wall.list();

  if (walls.length) {
    wall = walls[0];

    for (const zone of wall.zones) {
      if (zone.tier.level > wall.tier.level) {
        field = zone;

        return true;
      }
    }
  }
}

function maintainWallKeeperJob() {
  const keeperType = findWallKeeperType();

  if (keeperType && (!wallKeeperJob || wallKeeperJob.isDone || wallKeeperJob.isFailed)) {
    wallKeeperJob = new WallKeeper(keeperType);
  }
}

function maintainDefenderJobs() {
  if (mode === MODE_READY) {
    for (const job of defenderJobs) {
      job.close(true);
      defenderJobs.delete(job);
    }
  } else if (mode === MODE_DEFEND) {
    for (const warrior of Units.warriors().values()) {
      if ((warrior.type.damageGround > 0) && (warrior.type.rangeGround > 3)) {
        if (warrior.job) {
          if (warrior.job === wallKeeperJob) continue;
          if (defenderJobs.has(warrior.job)) continue;
  
          warrior.job.close(true);
        }
  
        defenderJobs.add(new WallDefender(warrior));
      }
    }
  } 
}

function maintainRallyPoints() {
  for (const facility of Units.buildings().values()) {
    if (facility.isActive && WARRIOR_FACTORY[facility.type.name]) {
      setRallyPoint(facility, selectRallyPoint(facility, wall));
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
  if ((warrior.order.abilityId === 23) && isSamePosition(warrior.body, pos)) return;

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

function orderAttack(warrior, target) {
  if (!warrior || !target) return;

  if ((warrior.order.abilityId !== 23) || (warrior.order.targetUnitTag !== target.tag)) {
    new Order(warrior, 23, target);
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

function squareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
