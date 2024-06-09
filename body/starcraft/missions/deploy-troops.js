import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import Zone from "../map/zone.js";

const PERIMETER = 1;
const FRONTIER = 2;
const UNKNOWN = 3;
const FIGHT = 4;
const THREAT = 5;

const REQUEST_FIGHTER_DPS = 15;
const REQUEST_FIGHTER_HEALTH = 150;
const REQUEST_FIGHTER_STRENGTH = REQUEST_FIGHTER_DPS * REQUEST_FIGHTER_HEALTH;

const ALL_IN_START = 25;
const ALL_IN_STOP = 20;

export default class DeployTroopsMission extends Mission {

  run() {

    // Classify zones

    const armyZones = Zone.list().filter(zone => !!zone.warriors.size);
    if (!armyZones.length) return;

    const classified = new Set();
    let wave = new Set(armyZones);

    for (const zone of armyZones) {
      zone.deployment = zone.threats.size ? FIGHT : PERIMETER;
      classified.add(zone);
    }

    while (wave.size) {
      const nextWave = new Set();

      for (const zone of wave) {
        for (const corridor of zone.corridors) {
          for (const neighbor of corridor.zones) {
            if (!classified.has(neighbor)) {
              nextWave.add(neighbor);
            }
          }
        }
      }

      for (const zone of nextWave) {
        const entryClassification = getEntryClassification(zone, classified);

        if (zone.threats.size) {
          zone.deployment = (entryClassification < UNKNOWN) ? FIGHT : THREAT;
        } else if (zone.warriors.size) {
          zone.deployment = PERIMETER;
        } else if (entryClassification < UNKNOWN) {
          zone.deployment = zone.buildings.size ? PERIMETER : FRONTIER;
        } else {
          zone.deployment = UNKNOWN;
        }

        classified.add(zone);
      }

      wave = nextWave;
    }

    for (const zone of Zone.list().filter(zone => !classified.has(zone))) {
      zone.deployment = zone.threats.size ? THREAT : UNKNOWN;
    }

    // Create fights
    
    let rallyFight; // TODO: Map rally fights for each zone while classifying the zones
    let idleFighters = 0;

    for (const warrior of Units.warriors().values()) {
      if (!warrior.job) {
        idleFighters++;
      }
    }

    for (const zone of Zone.list()) {
      if (zone.deployment === FIGHT) {
        const priority = 100 - zone.tier.level;

        if (zone.fight) {
          zone.fight.priority = priority;
        } else {
          new Fight(priority, zone);
        }

        zone.fight.evaluate();

        for (const job of zone.fight.fighters) {
          if (!job.assignee) {
            idleFighters--;
          }
        }

        if (!rallyFight || (zone.fight.priority > rallyFight.priority)) {
          rallyFight = zone.fight;
        }
      } else if (zone.fight) {
        zone.fight.close();
        zone.fight = null;
      }
    }

    if (rallyFight && (idleFighters > 0)) {
      for (let i = 0; i < idleFighters; i++) {
        new Fighter(rallyFight);
      }
    }
  }

}

function getEntryClassification(zone, classified) {
  for (const corridor of zone.corridors) {
    for (const neighbor of corridor.zones) {
      if (classified.has(neighbor) && (neighbor.deployment < UNKNOWN)) {
        return FRONTIER;
      }
    }
  }

  return UNKNOWN;
}

const STAND = 0;
const ATTACK = 1;
const RALLY = 2;
const RETREAT = 3;

class Fight {

  constructor(priority, zone) {
    this.priority = priority;
    this.zone = zone;

    const zones = new Set();
    for (const corridor of zone.corridors) {
      for (const neighbor of corridor.zones) {
        zones.add(neighbor);
      }
    }
    zones.add(zone);
    this.zones = [...zones];

    this.detector = new Detector(this);
    this.fighters = [];

    zone.fight = this;

    this.modes = ["stand", "attack", "rally", "retreat"];
    this.shift(RALLY);
  }

  isWarriorRallied(warrior) {
    return !!(warrior && this.zones.find(zone => (warrior.zone === zone)));
  }

  isWarriorInThreatRange(warrior) {
    const BUFFER = 3;
    const wx = warrior.body.x;
    const wy = warrior.body.y;
    const wr = warrior.body.r;

    for (const zone of this.zones) {
      for (const enemy of zone.threats) {
        if (enemy.type.damageGround > 0) {
          const range = enemy.body.r + Math.max(enemy.type.rangeGround, 1) + wr + BUFFER;
          const squareRange = range * range;
          const squareDistance = (enemy.body.x - wx) * (enemy.body.x - wx) + (enemy.body.y - wy) * (enemy.body.y - wy);

          if (squareDistance <= squareRange) return true;
        }
      }
    }
  }

  evaluate() {
    // TODO: Calculate ground and air DPS, and ground and air health
    let availableDps = 1;
    let availableHealth = 1;
    let requestedDps = 1;
    let requestedHealth = 1;
    let enemyDps = 1;
    let enemyHealth = 1;
    let ralliedWarriorCount = 0;

    for (const zone of this.zones) {
      for (const enemy of zone.threats) {
        if (enemy.type.damageGround > 0) {
          enemyDps += enemy.type.damageGround;
          enemyHealth += enemy.armor.health + enemy.armor.shield;
        }
      }
    }

    for (const job of this.fighters) {
      const warrior = job.assignee;

      if (warrior) {
        requestedDps += warrior.type.damageGround;
        requestedHealth += warrior.armor.health + warrior.armor.shield;

        if (this.isWarriorRallied(warrior)) {
          ralliedWarriorCount++;

          availableDps += warrior.type.damageGround;
          availableHealth += warrior.armor.health + warrior.armor.shield;
        }
      } else {
        // TODO: Tune the request expectations and put the expectations in the job description so that the right warriors are hired
        requestedDps += REQUEST_FIGHTER_DPS;
        requestedHealth += REQUEST_FIGHTER_HEALTH;
      }
    }

    const availableStrength = availableHealth * availableDps;
    const requestedStrength = requestedHealth * requestedDps;
    const enemyStrength = enemyHealth * enemyDps;

    const requestedFightRatio = requestedStrength / enemyStrength;
    if (requestedFightRatio < 2) {
      const neededFighters = Math.ceil(enemyStrength * (2 - requestedFightRatio) / REQUEST_FIGHTER_STRENGTH);

      for (let i = 0; i < neededFighters; i++) {
        new Fighter(this);
      }
    }
    // TODO: Release fighters when the ratio is too much in our favor

    const availableFightRatio = availableStrength / enemyStrength;

    if (ralliedWarriorCount >= ALL_IN_START) {
      this.shift(ATTACK);
    } else if ((this.mode === ATTACK) && (ralliedWarriorCount >= ALL_IN_STOP)) {
      this.shift(ATTACK);
    } else if (availableFightRatio > 2) {
      this.shift(ATTACK);
    } else if (availableFightRatio < 1) {
      if ((this.mode === ATTACK) || (this.mode === RETREAT)) {
        this.shift(RETREAT);
      } else {
        this.shift(RALLY);
      }
    }

    this.balance = availableFightRatio;

//    if (this.mode === ATTACK) {
//      assignTargets(this);
//    }
  }

  shift(mode, silent) {
    if (!silent && (this.mode !== mode) && (this.mode !== undefined)) {
      console.log("Fight", this.zone.name, "switches from", this.modes[this.mode], "to", this.modes[mode]);
    }

    this.mode = mode;
  }

  close() {
    this.detector.close(true);

    for (const job of this.fighters) {
      job.close(true);
    }

    if (this.zone.fight === this) {
      this.zone.fight = null;
    }
  }
}

class Detector extends Job {

  constructor(fight) {
    super("Observer");

    this.priority = fight.priority;
    this.zone = fight.zone;
    this.details = this.summary + " " + fight.zone.name;

    this.fight = fight;
    this.shield = 0;

    this.escapeZone = this.findEscapeZone();
  }

  findEscapeZone() {
    let bestZone = this.fight.zone;
    let bestDanger = this.fight.zone.threats.size;

    for (const zone of this.fight.zones) {
      if (zone.isCorridor) continue;
      if (!zone.threats.size) return zone;

      if (zone.threats.size < bestDanger) {
        bestZone = zone;
        bestDanger = zone.threats.size;
      }
    }

    return bestZone;
  }

  execute() {
    const observer = this.assignee;
    const zone = this.fight.zone;

    if (observer.armor.shield < this.shield) {
      if (this.escapeZone.threats.size) {
        this.escapeZone = this.findEscapeZone();
      }

      orderMove(observer, this.escapeZone);
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
      this.seek = null;
    }

    this.shield = observer.armor.shield;
  }

}

class Fighter extends Job {

  constructor(fight) {
    super("Warrior");

    this.priority = fight.priority - 1;
    this.zone = fight.zone;
    this.details = this.summary + " " + fight.zone.name;
    this.isCommitted = false;

    this.fight = fight;
    this.thisZone = null;
    this.lastZone = null;
    this.rallyZone = null;

    fight.fighters.push(this);

    this.modes = ["stand", "attack", "rally", "retreat"];
    this.shift(STAND);
  }

  execute() {
    const zone = this.zone;
    const warrior = this.assignee;

    if (this.target && (!this.target.isAlive || ((this.target.zone !== zone) && (this.target.zone !== warrior.zone)))) {
      this.shift(STAND);
      this.target = null;
    }

    if (this.thisZone !== warrior.zone) {
      this.lastZone = this.thisZone;
      this.thisZone = warrior.zone;
    }

    if (!warrior.isAlive) {
      this.assignee = null;
    } else if ((this.fight.mode === RALLY) || (this.fight.mode === RETREAT)) {
      if (this.fight.isWarriorInThreatRange(warrior)) {
        if (!this.rallyZone || isCloseTo(warrior.body, this.rallyZone)) {
          this.rallyZone = findSafeZone(warrior.zone);
        }

        if (this.rallyZone) {
          orderMove(warrior, this.rallyZone);
          this.shift(RALLY);
        } else if (this.mode !== ATTACK) {
          orderFight(warrior, warrior.zone);
          this.shift(ATTACK);
        }
      } else if (this.fight.isWarriorRallied(warrior)) {
        orderStop(warrior);
        this.shift(STAND);
        this.rallyZone = warrior.zone;
      } else {
        orderMove(warrior, zone);
        this.shift(RALLY);
        this.rallyZone = zone;
      }
    } else if (this.target) {
      orderAttack(warrior, this.target);
    } else if (warrior.zone.enemies.size) {
      this.target = findClosestTarget(warrior, warrior.zone.enemies);

      if (this.target) {
        orderAttack(warrior, this.target);
        this.shift(ATTACK);
      } else if (this.mode !== ATTACK) {
        orderFight(warrior, warrior.zone);
        this.shift(ATTACK);
      }
    } else if (zone.enemies.size) {
      this.target = findClosestTarget(warrior, zone.enemies);

      if (this.target) {
        orderAttack(warrior, this.target);
        this.shift(ATTACK);
      } else if (this.mode !== ATTACK) {
        orderFight(warrior, zone);
        this.shift(ATTACK);
      }
    } else if (zone.threats.size) {
      const threat = findClosestTarget(warrior, zone.threats);

      if (threat) {
        if (isCloseTo(warrior.body, threat.body)) {
          zone.threats.delete(threat);
        } else {
          orderMove(warrior, threat.body);
        }
      } else if (this.mode !== ATTACK) {
        orderFight(warrior, zone);
        this.shift(ATTACK);
      }
    } else if (this.mode !== ATTACK) {
      orderFight(warrior, zone);
      this.shift(ATTACK);
    }
  }

}

//function assignTargets(fight) {
//  const zone = fight.zone;
//  const attackers = new Map();
//
//  for (const fighter of fight.fighters) {
//    const warrior = fighter.assignee;
//
//    if (!warrior || warrior.weapon.cooldown) continue;
//
//    for (const enemy of zone.enemies) {
//      // Don't focus fire on enemy units that cannot hit us
//      if (!enemy.type.damageGround) continue;
//      if (enemy.body.isGround && (!warrior.type.damageGround || !isInRange(warrior, enemy, warrior.type.rangeGround))) continue;
//      if (enemy.body.isFlying && (!warrior.type.damageAir || !isInRange(warrior, enemy, warrior.type.rangeAir))) continue;
//
//      const list = attackers.get(enemy);
//
//      if (list) {
//        list.push(warrior);
//      } else {
//        attackers.set(enemy, [warrior]);
//      }
//    }
//
//    warrior.target = null;
//  }
//
//  const sorted = [];
//  for (const [target, warriors] of attackers) {
//    sorted.push({ target, warriors });
//  }
//  sorted.sort((a, b) => (b.warriors.length - a.warriors.length));
//
//  for (const one of sorted) {
//    const target = one.target;
//
//    for (const warrior of one.warriors) {
//      if (!warrior.target) {
//        warrior.target = target;
//      }
//    }
//  }
//}
//
//function isInRange(warrior, enemy, range) {
//  const dr = warrior.body.r + range + enemy.body.r;
//  const dx = (enemy.body.x - warrior.body.x);
//  const dy = (enemy.body.y - warrior.body.y);
//  const squareRange = dr * dr;
//  const squareDistance = dx * dx + dy * dy;
//
//  return (squareDistance <= squareRange);
//}

function findSafeZone(zone) {
  for (const corridor of zone.corridors) {
    for (const neighbor of corridor.zones) {
      if (neighbor.deployment < UNKNOWN) {
        return neighbor;
      }
    }
  }
}

function findClosestTarget(warrior, units) {
  const canHitGround = (warrior.type.damageGround > 0);
  const canHitAir = (warrior.type.damageAir > 0);

  let targetUnit;
  let targetDistance = Infinity;
  let targetFights = false;

  for (const unit of units) {
    if ((unit.body.isGround && !canHitGround) || (unit.body.isFlying && !canHitAir)) continue;
    if (targetFights && !unit.type.damageGround) continue;

    const distance = (warrior.body.x - unit.body.x) * (warrior.body.x - unit.body.x) + (warrior.body.y - unit.body.y) * (warrior.body.y - unit.body.y);

    if (distance < targetDistance) {
      targetUnit = unit;
      targetDistance = distance;
      targetFights = !!unit.type.damageGround;
    }
  }

  return targetUnit;
}

function orderMove(warrior, pos) {
  if (!warrior || !warrior.order || !pos) return;
  if (!warrior.order.abilityId && isCloseTo(warrior.body, pos)) return;

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos);
  }
}

function orderStop(warrior) {
  if (!warrior) return;

  if (warrior.order.abilityId) {
    new Order(warrior, 3665).accept(true);
  }
}

function orderAttack(warrior, enemy) {
  if (!warrior || !enemy) return;
  if (!warrior.type.damageGround && !warrior.type.damageAir) return;

  if ((warrior.order.abilityId !== 23) || (warrior.order.targetUnitTag !== enemy.tag)) {
    new Order(warrior, 23, enemy);
  }
}

function orderFight(warrior, zone) {
  if (!warrior || !zone) return;
  if (!warrior.type.damageGround && !warrior.type.damageAir) return;

  if (warrior.order.abilityId !== 23) {
    new Order(warrior, 23, zone).accept(true);
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) <= 6) && (Math.abs(a.y - b.y) <= 6);
}
