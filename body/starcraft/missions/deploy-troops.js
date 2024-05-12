import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import Zone from "../map/zone.js";
import Resources from "../memo/resources.js";

const PERIMETER = 1;
const PATROL = 2;
const UNKNOWN = 3;
const FIGHT = 4;
const THREAT = 5;

const guards = new Map();
const retreat = new Map();
let pylon;

export default class DeployTroopsMission extends Mission {

  run() {
    closeDeadGuardJobs();
    classifyZones();
    createGuardJobs();
    createFightJobs();
    createPylonJob();
  }

}

class Guard extends Job {

  constructor(zone, priority) {
    super("Stalker");

    this.summary = "Guard " + zone.name;
    this.priority = priority;
    this.zone = zone;
    this.retreat = retreat.get(this.zone);
    this.shield = 0;
  }

  execute() {
    const stalker = this.assignee;

    if (stalker.zone.threats.size || (stalker.armor.shield < this.shield)) {
      stalker.zone.deployment = THREAT;

      orderMove(stalker, this.retreat);
    } else {
      if (isSamePosition(stalker.body, this.zone) && isZoneSecure(this.zone)) {
        this.zone.deployment = PERIMETER;
      } else {
        orderMove(stalker, this.zone);
      }
    }

    this.shield = stalker.armor.shield;
  }

}

class Fight {

  constructor(priority, zone, corridor, rally) {
    this.summary = "Fight " + zone.name;
    this.priority = priority;
    this.zone = zone;
    this.corridor = corridor;
    this.rally = rally;
    this.jobs = [];
    this.isInAttack = false;
    this.detector = new Detector(this);

    zone.fight = this;
  }

  ask() {
    return Math.max(1, this.zone.threats.size * 2);
  }

  use(availableWarriorCount, extraWarriorCount) {
    const neededWarriorCount = this.ask();
    const engagedWarriorCount = (availableWarriorCount >= neededWarriorCount) ? neededWarriorCount + extraWarriorCount : availableWarriorCount;
    let ralliedWarriorCount = 0;

    if (this.jobs.length < engagedWarriorCount) {
      for (let i = this.jobs.length; i < engagedWarriorCount; i++) {
        this.jobs.push(new Fighter(this));
      }
    } else if (this.jobs.length > engagedWarriorCount) {
      for (let i = engagedWarriorCount; i < this.jobs.length; i++) {
        this.jobs[i].close(true);
      }

      this.jobs.length = engagedWarriorCount;
    }

    for (const job of this.jobs) {
      const warrior = job.assignee;

      if (warrior && ((warrior.zone === this.zone) || (warrior.zone === this.corridor) || (warrior.zone === this.rally))) {
        ralliedWarriorCount++;
      }
    }

this.traceSummary = "Fight " + this.zone.summary + " (" + ralliedWarriorCount + " / " + neededWarriorCount + ")";

    this.isInAttack = (ralliedWarriorCount >= neededWarriorCount) || (ralliedWarriorCount >= 30) || (this.rally === this.zone);

    return this.jobs.length;
  }

  close() {
    this.detector.close(true);

    for (const job of this.jobs) {
      job.close(true);
    }

    this.zone.fight = null;
  }
}

class Detector extends Job {

  constructor(fight) {
    super("Observer");

    this.summary = "Detect " + fight.zone.name;
    this.priority = fight.priority;
    this.fight = fight;
    this.shield = 0;
  }

  execute() {
    const observer = this.assignee;
    const zone = this.fight.zone;

    if (observer.armor.shield < this.shield) {
      orderMove(observer, this.fight.rally);
    } else if (observer.zone !== zone) {
      orderMove(observer, zone);
    } else if (zone.threats.size) {
      if (this.seek && (this.seek.zone === zone) && !zone.enemies.has(this.seek)) {
        if (isCloseTo(observer.body, this.seek.body)) {
          zone.threats.delete(this.seek);
          this.seek = null;
        }
      } else {
        this.seek = null;

        for (const threat of zone.threats) {
          if (zone.enemies.has(threat)) continue;

          orderMove(observer, threat.body);
          this.seek = threat;
          break;
        }
      }
    } else {
      zone.deployment = UNKNOWN;
      this.seek = null;
    }

    this.shield = observer.armor.shield;
  }

}

let id = 101;

class Fighter extends Job {

  constructor(fight) {
    super("Warrior");

    this.fight = fight;
    this.summary = fight.summary;
    this.priority = fight.priority - 1;
    this.zone = fight.zone;

this.id = id++;
this.summary = (this.fight.isInAttack ? "Attack" : "Rally") + "#" + this.id + " " + this.fight.rally.name + "-" + this.fight.corridor.name + "->" + this.fight.zone.name;
  }

  execute() {
this.summary = (this.fight.isInAttack ? "Attack" : "Rally") + "#" + this.id + " " + this.fight.rally.name + "-" + this.fight.corridor.name + "->" + this.fight.zone.name;
    const isInAttack = this.fight.isInAttack;
    const zone = this.zone;
    const warrior = this.assignee;

    if (this.target && (!this.target.isAlive || (this.target.zone !== zone))) {
      this.isAttacking = false;
      this.target = null;
    }

    if (!warrior.isAlive) {
      this.release(warrior);
    } else if (!isInAttack) {
      // TODO: Select approach zone based on warrior zone. Maintain global pathing which gets lazy recalculation when zone classification changes
      orderMove(warrior, this.fight.rally);
      this.isAttacking = false;
    } else if (this.target) {
      orderAttack(warrior, this.target);
    } else if (zone.enemies.size) {
      this.target = findClosestTarget(warrior, zone.enemies);

      if (this.target) {
        orderAttack(warrior, this.target);
      }
    } else if (zone.threats.size) {
      const threat = findClosestTarget(warrior, zone.threats);

      if (threat) {
        if (isCloseTo(warrior.body, threat.body)) {
          zone.threats.delete(threat);
        } else {
          orderMove(warrior, threat.body);
        }
      }

      this.isAttacking = false;
    } else if (!this.isAttacking) {
      zone.deployment = UNKNOWN;

      new Order(warrior, 23, zone).accept(true);
      this.isAttacking = true;
    }
  }

}

// TODO: Focus fire on enemy units in range
function findClosestTarget(warrior, units) {
  const canHitGround = (warrior.type.damageGround > 0);
  const canHitAir = (warrior.type.damageAir > 0);

  let targetUnit;
  let targetDistance = Infinity;

  for (const unit of units) {
    if ((unit.isGround && !canHitGround) || (unit.isFlying && !canHitAir)) continue;

    const distance = (warrior.body.x - unit.body.x) * (warrior.body.x - unit.body.x) + (warrior.body.y - unit.body.y) * (warrior.body.y - unit.body.y);

    if (distance < targetDistance) {
      targetUnit = unit;
      targetDistance = distance;
    }
  }

  return targetUnit;
}

function isZoneSecure(zone) {
  for (const corridor of zone.corridors) {
    if (corridor.deployment >= FIGHT) return false;

    for (const neighbor of corridor.zones) {
      if (neighbor.deployment >= UNKNOWN) return false;
      if (!neighbor.warriors.size) return false;
    }
  }

  return true;
}

function closeDeadGuardJobs() {
  for (const [zone, guard] of guards) {
    if (guard.assignee && !guard.assignee.isAlive) {
      guards.delete(zone);
    }
  }
}

function classifyZones() {
  const zones = Zone.list().sort((a, b) => (a.tier.level + (a.isCorridor ? 0.5 : 0) - b.tier.level - (b.isCorridor ? 0.5 : 0)));
  const blocked = new Set();

  for (const zone of zones) {
    if (zone.threats.size) {
      zone.deployment = (zone.deployment === PERIMETER) ? FIGHT : THREAT;
    } else if (zone.buildings.size) {
      zone.deployment = PERIMETER;
    } else if (!zone.deployment) {
      zone.deployment = UNKNOWN;
    }
  }

  for (const zone of zones) {
    if (zone.isCorridor) {
      const corridor = zone;
      const neighbora = corridor.zones[0];
      const neighborb = corridor.zones[1];

      if (corridor.deployment < FIGHT) {
        if ((neighbora.deployment === UNKNOWN) && (neighborb.deployment === PERIMETER)) {
          neighbora.deployment = PATROL;
          retreat.set(neighbora, neighborb);
        } else if ((neighborb.deployment === UNKNOWN) && (neighbora.deployment === PERIMETER)) {
          neighborb.deployment = PATROL;
          retreat.set(neighborb, neighbora);
        }
      }
    }
  }

  for (const zone of zones) {
    const isBlocked = blocked.has(zone);

    if (isBlocked) {
      if (zone.deployment === FIGHT) zone.deployment = THREAT;
    } else {
      if (zone.deployment === THREAT) zone.deployment = FIGHT;
    }

    if (isBlocked || (zone.deployment >= FIGHT)) {
      if (zone.isCorridor) {
        for (const neighbor of zone.zones) {
          if ((neighbor.tier.level >= zone.tier.level) && (neighbor.deployment !== PERIMETER)) blocked.add(neighbor);
        }
      } else {
        for (const neighbor of zone.corridors) {
          if ((neighbor.tier.level >= zone.tier.level) && (neighbor.deployment !== PERIMETER)) blocked.add(neighbor);
        }
      }
    }
  }
}

function createGuardJobs() {
  for (const zone of Zone.list()) {
    if (zone.isCorridor) continue;

    const guard = guards.get(zone);

    if (zone.deployment === PATROL) {
      const priority = 80 - zone.tier.level;

      if (guard) {
        guard.priority = priority;
      } else {
        guards.set(zone, new Guard(zone, priority));
      }
    } else if (guard) {
      guard.close(true);
      guards.delete(zone);
    }
  }
}

function createFightJobs() {
  const sorted = [];

  for (const zone of Zone.list()) {
    if (zone.deployment === FIGHT) {
      const priority = 100 - zone.tier.level;

      if (zone.fight) {
        zone.fight.priority = priority;
      } else {
        const approach = getFightApproach(zone);
        new Fight(priority, zone, approach.corridor, approach.rally);
      }

      sorted.push(zone.fight);
    } else if (zone.fight) {
      zone.fight.close();
    }
  }

  sorted.sort((a, b) => (b.priority - a.priority));

  let remainingWarriors = Units.warriors().size;
  let neededWarriors = 0;

  for (const fight of sorted) {
    neededWarriors += fight.ask();
  }

  const extra = Math.max(Math.ceil((remainingWarriors - neededWarriors) / sorted.length), 0);
  for (const fight of sorted) {
    // TODO: Deploy troops based on DPS rather than number of units
    if (remainingWarriors > 0) {
      remainingWarriors -= fight.use(remainingWarriors, extra);
    } else {
      fight.use(0);
    }
  }
}

function getFightApproach(zone) {
  let corridor = zone;
  let rally = zone;

  if (zone.isCorridor) {
    for (const neighbor of zone.zones) {
      if ((neighbor.deployment < FIGHT) && (neighbor.tier.level <= zone.tier.level)) {
        rally = neighbor;
      }
    }
  } else {
    for (const one of zone.corridors) {
      for (const neighbor of one.zones) {
        if ((neighbor.deployment < FIGHT) && (neighbor.tier.level < zone.tier.level)) {
          corridor = one;
          rally = neighbor;
        }
      }
    }
  }

  return { corridor, rally };
}

function createPylonJob() {
  if (pylon) {
    if (pylon.isFailed || pylon.isDone) {
      pylon = null;
    } else {
      // A pylon is already being built
      return;
    }
  }

  if ((Resources.minerals < 100) || (Resources.supplyUsed < 197)) return;

  let pos;

  for (const zone of Zone.list()) {
    if ((zone.deployment === PERIMETER) && !zone.buildings.size) {
      pos = zone.isDepot ? zone.exitRally : zone;
      break;
    }
  }

  if (pos) {
    pylon = new Build("Pylon", pos);
    pylon.priority = 80;
  }
}

function orderMove(warrior, pos) {
  if (!warrior || !warrior.order || !pos) return;
  if (isCloseTo(warrior.body, pos)) return;

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos);
  }
}

function orderAttack(warrior, enemy) {
  if (!warrior || !enemy) return;

  if ((warrior.order.abilityId !== 23) || (warrior.order.targetUnitTag !== enemy.tag)) {
    new Order(warrior, 23, enemy);
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) <= 6) && (Math.abs(a.y - b.y) <= 6);
}
