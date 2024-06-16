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

const ALL_IN_THRESHOLD = 25; // Implement focus fire for warriors that cannot retreat
const ATTACK_THRESHOLD = 2;
const RETREAT_THRESHOLD = 1;

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

    this.zones = new Set();
    this.zones.add(zone);
    for (const corridor of zone.corridors) {
      for (const neighbor of corridor.zones) {
        this.zones.add(neighbor);
      }
    }

    this.detector = new Detector(this);
    this.fighters = [];

    zone.fight = this;

    this.modes = ["stand", "attack", "rally", "retreat"];
    this.shift(RALLY);

    this.thresholdAttack = ATTACK_THRESHOLD;
    this.thresholdRetreat = RETREAT_THRESHOLD;
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
    this.balance = assessCurrentBalance(this);

    const ralliedWarriorCount = countRalliedWarriors(this);

    if (ralliedWarriorCount >= ALL_IN_THRESHOLD) {
      this.thresholdAttack = 0;
      this.thresholdRetreat = 0;
    }

    if (this.balance >= this.thresholdAttack) {
      this.shift(ATTACK);
    } else if (this.balance <= this.thresholdRetreat) {
      if ((this.mode === ATTACK) || (this.mode === RETREAT)) {
        this.shift(RETREAT);
      } else {
        this.shift(RALLY);
      }
    }

    if (assessRequestedBalance(this) < this.thresholdAttack) {
      new Fighter(this);
    }

    assignTargets(this);
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
    this.target = null;
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

    if (!warrior.zone) {
      console.log("OOOPS! Warrior", warrior.type.name, warrior.nick, "is outside any zone at", warrior.body.x.toFixed(1), warrior.body.y.toFixed(1), "near", zone.name);
      this.assign(null);
      return;
    }

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
        } else if (this.target) {
          orderAttack(warrior, this.target);
          this.shift(ATTACK);
        } else if (this.mode !== ATTACK) {
          orderFight(warrior, zone);
          this.shift(ATTACK);
        }
      } else if (this.fight.zones.has(warrior.zone)) {
        orderStop(warrior);
        this.shift(STAND);
        this.rallyZone = warrior.zone;
      } else {
        orderMove(warrior, zone);
        this.shift(RALLY);
      }
    } else if (this.target) {
      orderAttack(warrior, this.target);
      this.shift(ATTACK);
    } else if (zone.enemies.size) {
      orderFight(warrior, zone);
      this.shift(ATTACK);
    } else if (zone.threats.size) {
      const threat = findClosestThreat(warrior, zone.threats);

      if (isCloseTo(warrior.body, threat.body)) {
        zone.threats.delete(threat);
      } else {
        orderMove(warrior, threat.body);
      }
    } else if (this.mode !== ATTACK) {
      orderFight(warrior, zone);
      this.shift(ATTACK);
    }
  }

}

function countRalliedWarriors(fight) {
  let count = 0;

  for (const job of fight.fighters) {
    const warrior = job.assignee;

    if (warrior && fight.zones.has(warrior.zone)) {
      count++;
    }
  }

  return count;
}

function assessCurrentBalance(fight) {
  // TODO: Calculate ground and air DPS, and ground and air health
  let availableDps = 1;
  let availableHealth = 1;
  let enemyDps = 1;
  let enemyHealth = 1;

  for (const zone of fight.zones) {
    for (const enemy of zone.threats) {
      if (enemy.type.damageGround > 0) {
        enemyDps += enemy.type.damageGround;
        enemyHealth += enemy.armor.health + enemy.armor.shield;
      }
    }
  }

  for (const job of fight.fighters) {
    const warrior = job.assignee;

    if (warrior && fight.zones.has(warrior.zone)) {
      availableDps += warrior.type.damageGround;
      availableHealth += warrior.armor.health + warrior.armor.shield;
    }
  }

  const availableStrength = availableHealth * availableDps;
  const enemyStrength = enemyHealth * enemyDps;

  return (availableStrength / enemyStrength);
}

function assessRequestedBalance(fight) {
  // TODO: Calculate ground and air DPS, and ground and air health
  let requestedDps = 1;
  let requestedHealth = 1;
  let enemyDps = 1;
  let enemyHealth = 1;

  for (const zone of fight.zones) {
    for (const enemy of zone.threats) {
      if (enemy.type.damageGround > 0) {
        enemyDps += enemy.type.damageGround;
        enemyHealth += enemy.armor.health + enemy.armor.shield;
      }
    }
  }

  for (const job of fight.fighters) {
    const warrior = job.assignee;

    if (warrior) {
      requestedDps += warrior.type.damageGround;
      requestedHealth += warrior.armor.health + warrior.armor.shield;
    } else {
      // TODO: Tune the request expectations and put the expectations in the job description so that the right warriors are hired
      requestedDps += REQUEST_FIGHTER_DPS;
      requestedHealth += REQUEST_FIGHTER_HEALTH;
    }
  }

  const requestedStrength = requestedHealth * requestedDps;
  const enemyStrength = enemyHealth * enemyDps;

  return (requestedStrength / enemyStrength);
}

function assignTargets(fight) {
  const zone = fight.zone;
  const fighters = new Set();
  const attacks = new Set();

  for (const fighter of fight.fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive) {
      fighter.targets = new Set();
      fighter.walk = (warrior.weapon.cooldown < warrior.type.weaponCooldown) ? warrior.type.movementSpeed * warrior.weapon.cooldown : 0;

      fighters.add(fighter);
    }
  }

  for (const enemy of zone.enemies) {
    const attackers = new Set();
    let damage = 0;

    for (const fighter of fighters) {
      const warrior = fighter.assignee;

      if (!isValidTarget(fighter, warrior, enemy)) continue;

      fighter.targets.add(enemy);

      if (enemy.body.isGround) {
        damage += warrior.type.attackGround;
      } else if (enemy.body.isFlying) {
        damage += warrior.type.attackAir;
      }
      attackers.add(fighter);
    }

    if (damage > 0) {
      attacks.add({ enemy: enemy, damage: damage, fighters: attackers });
    }
  }

  while (attacks.size) {
    const attack = findBestAttack(attacks);
    const enemy = attack.enemy;
    let health = enemy.armor.health + enemy.armor.shield;

    attacks.delete(attack);

    const attackers = [...attack.fighters].sort(function(a, b) {
      if (a.targets.size === b.targets.size) return (b.assignee.weapon.cooldown - a.assignee.weapon.cooldown);
      return (a.targets.size - b.targets.size);
    });

    // Keep fighters already targeting this enemy unit preferring those with less weapon cooldown
    for (const fighter of attack.fighters) {
      if (fighter.target !== enemy) continue;

      health -= lockFighterOnEnemyAndRemoveFromOtherAttacks(fighters, attacks, fighter, enemy);

      if (health <= 0) break;
    }

    if (health <= 0) continue;

    // Add fighters with least other enemies in range preferring those with less weapon cooldown
    for (const fighter of attackers) {
      if (fighter.target === enemy) continue;

      health -= lockFighterOnEnemyAndRemoveFromOtherAttacks(fighters, attacks, fighter, enemy);

      if (health <= 0) break;
    }
  }
}

function lockFighterOnEnemyAndRemoveFromOtherAttacks(fighters, attacks, fighter, enemy) {
  const warrior = fighter.assignee;
  const damage = enemy.body.isGround ? warrior.type.attackGround : warrior.type.attackAir;

  fighter.target = enemy;
  fighters.delete(fighter);

  for (const attack of attacks) {
    if (attack.fighters.has(fighter)) {
      attack.fighters.delete(fighter);

      if (attack.enemy.body.isGround) {
        attack.damage -= warrior.type.attackGround;
      } else if (other.enemy.body.isFlying) {
        attack.damage -= warrior.type.attackAir;
      }

      if (attack.damage <= 0) {
        attacks.delete(attack);
      }
    }
  }

  return damage;
}

function findBestAttack(attacks) {
  // TODO: Prefer instant kills (damage >= health)
  // TODO: Prefer lower health (min health)
  // TODO: Prefer enemy with higher DPS
  // TODO: Prefer attack which concentrates higher warrior DPS
  // TODO: Prefer cast spellers with large impact
  let bestAttack;
  let bestRemain = Infinity;

  for (const attack of attacks) {
    const remain = attack.enemy.armor.shield + attack.enemy.armor.health - attack.damage;
    if (remain < bestRemain) {
      bestAttack = attack;
      bestRemain = remain;
    }
  }

  return bestAttack;
}

function isValidTarget(fighter, warrior, target) {
  // Don't focus fire on enemy units that cannot hit us
  if (!target.type.damageGround) return false;

  // Don't focus fire on enemy units that are not in range
  if (target.body.isGround && (!warrior.type.damageGround || !isInRange(warrior, target, warrior.type.rangeGround, fighter.walk))) return false;
  if (target.body.isFlying && (!warrior.type.damageAir || !isInRange(warrior, target, warrior.type.rangeAir, fighter.walk))) return false;

  return true;
}

function isInRange(warrior, target, range, walk) {
  const dr = warrior.body.r + range + walk + target.body.r;
  const dx = (target.body.x - warrior.body.x);
  const dy = (target.body.y - warrior.body.y);
  const squareRange = dr * dr;
  const squareDistance = dx * dx + dy * dy;

  return (squareDistance <= squareRange);
}

function findSafeZone(zone) {
  for (const corridor of zone.corridors) {
    for (const neighbor of corridor.zones) {
      if (neighbor.deployment < UNKNOWN) {
        return neighbor;
      }
    }
  }
}

function findClosestThreat(warrior, units) {
  let targetUnit;
  let targetDistance = Infinity;

  for (const unit of units) {
    const distance = (warrior.body.x - unit.body.x) * (warrior.body.x - unit.body.x) + (warrior.body.y - unit.body.y) * (warrior.body.y - unit.body.y);

    if (distance < targetDistance) {
      targetUnit = unit;
      targetDistance = distance;
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
