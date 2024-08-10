import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";
import Attack from "../jobs/attack.js";
import Wall from "../map/wall.js";
import { ActiveCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";

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
const pullProbeJobs = new Set();

export default class WallNatural extends Mission {

  run() {
    if (mode === MODE_OFF) return;
    if (!wall && !findWallAndField()) return this.close();

    mode = field.enemies.size ? MODE_DEFEND : MODE_READY;

    if ((mode === MODE_READY) && (ActiveCount.Nexus >= 2) && (ActiveCount.Probe >= 33) && (ActiveCount.Stalker > 4)) {
      return this.close();
    }

    maintainWallKeeperJob();
    maintainDefenderJobs();
    maintainRallyPoints();
    maintainPullProbeJobs();
    maintainHarvestJobs();
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

    for (const job of Job.list()) {
      if (job.target && job.target.type && job.target.type.isExtractor) {
        job.priority = 50;
      }
    }

    for (const pullProbeJob of pullProbeJobs) {
      pullProbeJob.close(true);
    }
    pullProbeJobs.clear();
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
      if (enemy.armor.total < 0) continue;
      if (squareDistance(defender.body, enemy.body) > squareRange) continue;

      if (!target || (enemy.armor.total < target.armor.total)) {
        target = enemy;
      }
    }
    if (target) {
      target.armor.total -= defender.type.attackGround;

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

function maintainPullProbeJobs() {
  for (const job of pullProbeJobs) {
    if (job.isDone || job.isFailed) {
      pullProbeJobs.delete(job);
    }
  }

  const defendersCount = ActiveCount.Zealot + ActiveCount.Stalker + ActiveCount.Immortal;
  const attackersCount = countAttackers();

  let pullProbeCount = 0;

  if (defendersCount < 4) {
    pullProbeCount = attackersCount * 2 - defendersCount * 3;

    if ((pullProbeCount > 0) && (defendersCount < 2)) pullProbeCount += 2;

    pullProbeCount = Math.min(pullProbeCount, ActiveCount.Probe - 11);
    pullProbeCount = Math.max(pullProbeCount, 0);
  }

  if (pullProbeCount > pullProbeJobs.size) {
    const jobsToOpen = pullProbeCount - pullProbeJobs.size;

    for (let i = 0; i < jobsToOpen; i++) {
      pullProbeJobs.add(new Attack("Probe", wall, wall.blueprint.choke));
    }
  } else if (pullProbeCount < pullProbeJobs.size) {
    const jobsToClose = pullProbeJobs.size - pullProbeCount;
    let count = 0;

    for (const job of pullProbeJobs) {
      if (count >= jobsToClose) break;

      job.close(true);
      pullProbeJobs.delete(job);
      count++;
    }
  }
}

function countAttackers() {
  if (!VisibleCount.Warrior) return 0;

  let count = 0;

  for (const enemy of Units.enemies().values()) {
    if (Math.abs(enemy.body.x - wall.x) + Math.abs(enemy.body.y - wall.y) < 20) count++;
  }

  return count;
}

function maintainHarvestJobs() {
  const limit = (ActiveCount.Probe - pullProbeJobs.size >= 18) ? 6 : 3;
  let count = 0;

  // Keep the priority of vespene harvest jobs up to the limit, and lower the priority of any additional jobs
  for (const job of Job.list()) {
    if (job.target && job.target.type && job.target.type.isExtractor && (job.priority >= 90)) {
      if (count < limit) {
        job.priority = 90;
        count++;
      } else {
        job.priority = 0;
      }
    }
  }

  // Increase the priority of vespene harvest jobs to the limit, and lower the priority of any additional jobs
  for (const job of Job.list()) {
    if (job.target && job.target.type && job.target.type.isExtractor && (job.priority < 90)) {
      if (count < limit) {
        job.priority = 90;
        count++;
      } else {
        job.priority = 0;
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
