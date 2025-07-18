import Job from "../job.js";
import Order from "../order.js";
import Battle from "../battle/battle.js";

const SAFETY_DISTANCE = 3;
const LOOPS_LIMIT_DIRECTION = 10 * 22.4; // Limit of ten seconds to reach next target when observing the battle zone

export default class Detect extends Job {

  constructor(battle) {
    super("Observer");

    this.battle = battle;
    this.zone = battle.zone;
    this.details = "Detect " + battle.zone.name;
    this.isBusy = false;

    this.shield = 0;
    this.loopsInDirection = 0;
  }

  updateBattle(battle) {
    this.battle = battle;
    this.zone = battle.zone;

    this.summary = "Detect " + battle.zone.name;
    this.details = this.summary;
  }

  execute() {
    const observer = this.assignee;
    const mode = this.battle.mode;
    const threats = this.zone.threats;
    const isBattleInAttackMode = (mode === Battle.MODE_FIGHT) || (mode === Battle.MODE_MARCH) || (mode === Battle.MODE_SMASH);

    for (const threat of threats) {
      if ((threat.lastSeen < observer.lastSeen) && isInSight(observer, threat.body)) {
        threats.delete(threat);
      }
    }

    if ((observer.armor.shield >= observer.armor.shieldMax) && threats.size && !this.zone.enemies.size) {
      // All threats may be outside sight range, so the observer may need to get into their fire range if necessary. That's why do it on full shield.
      this.target = findClosestInvisibleThreat(observer, threats);
    } else if ((observer.armor.shield < this.shield) || isInEnemyFireRange(this.battle, observer)) {
      this.target = getRetreatPoint(observer, this.battle);
    } else if (!this.battle.zones.has(observer.zone)) {
      // Rally to battle zone
      // TODO: Make sure rally move doesn't go through threat zones
      this.target = this.zone;
    } else if (!shouldChangeTarget(observer, this.target, this.loopsInDirection, this.battle)) {
      // Should not change target
    } else if (isBattleInAttackMode) {
      this.target = selectTargetInAttackMode(observer, this.battle, this.target);
      this.loopsInDirection = 0;
    } else {
      this.target = selectTargetInRallyMode(observer, this.battle, this.target);
      this.loopsInDirection = 0;
    }

    if (this.target) {
      Order.move(observer, this.target);
    }

    this.isBusy = isBattleInAttackMode;
    this.shield = observer.armor.shield;
    this.loopsInDirection++;
  }

  close(outcome) {
    if (this.isDone || this.isFailed) return;

    Order.stop(this.assignee);

    super.close(outcome);
  }
}

function shouldChangeTarget(observer, target, loopsInDirection, battle) {
  if (!target) return true;
  if (loopsInDirection > LOOPS_LIMIT_DIRECTION) return true;
  if (isSamePosition(observer.body, target)) return true;
  if (!isTargetValid(battle, target)) return true;

  return false;
}

function selectTargetInAttackMode(observer, battle, previousTarget) {
  if (!previousTarget) return battle.zone;

  const invisibleThreat = findClosestInvisibleThreat(observer, battle.zone.threats, battle.zone.enemies, previousTarget);
  if (invisibleThreat) return invisibleThreat;

  if (previousTarget !== battle.zone) return battle.zone;

  const zones = [...battle.zone.neighbors].filter(zone => ((zone !== battle.zone) && (zone !== previousTarget) && !battle.lines.some(line => (line.zone === zone))));
  if (zones.length) return zones[Math.floor(zones.length * Math.random())];

  const bordercells = [...battle.zone.border];
  return bordercells[Math.floor(bordercells.length * Math.random())];
}

function selectTargetInRallyMode(observer, battle, previousTarget) {
  if (!previousTarget) return battle.zone;

  const invisibleThreat = findClosestInvisibleThreat(observer, battle.zone.threats, battle.zone.enemies, previousTarget);
  if (invisibleThreat) return invisibleThreat;

  if (previousTarget !== battle.zone) return battle.zone;

  const frontline = battle.lines.filter(line => ((line.zone !== battle.zone) && (line.zone !== previousTarget)));
  if (frontline.length) return frontline[Math.floor(frontline.length * Math.random())].zone;

  const bordercells = [...battle.zone.border];
  return bordercells[Math.floor(bordercells.length * Math.random())];
}

function findClosestInvisibleThreat(observer, threats, visible, exclude) {
  let closestThreat;
  let closestDistance = Infinity;

  for (const threat of threats) {
    if (exclude && (threat === exclude)) continue;
    if (visible && visible.has(threat)) continue;

    const distance = calculateSquareDistance(observer.body, threat.body);

    if (distance < closestDistance) {
      closestThreat = threat;
      closestDistance = distance;
    }
  }

  return closestThreat;
}

function getRetreatPoint(observer, battle) {
  let closestEnemy;
  let closestDistance = Infinity;

  for (const zone of battle.zones) {
    for (const threat of zone.threats) {
      if (threat.type.damageAir > 0) {
        const distance = calculateSquareDistance(observer.body, threat.body);

        if (distance < closestDistance) {
          closestEnemy = threat;
          closestDistance = distance;
        }
      }
    }
  }

  // Move away from the closest threatening enemy
  if (closestEnemy) {
    const dx = Math.sign(observer.body.x - closestEnemy.body.x) * 2;
    const dy = Math.sign(observer.body.y - closestEnemy.body.y) * 2;

    return { x: observer.body.x + dx, y: observer.body.y + dy };
  }

  // Else, find the closest battle line
  let closestLine;
  let closestLineDistance = Infinity;

  for (const line of battle.lines) {
    const distance = calculateSquareDistance(observer.body, line.zone);

    if (distance < closestLineDistance) {
      closestLine = line;
      closestLineDistance = distance;
    }
  }

  return closestLine ? closestLine.zone : battle.zone;
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}

function isInSight(observer, body) {
  const squareDistance = (observer.body.x - body.x) * (observer.body.x - body.x) + (observer.body.y - body.y) * (observer.body.y - body.y);
  const squareSight = observer.type.sightRange * observer.type.sightRange;

  return (squareDistance < squareSight);
}

function isInEnemyFireRange(battle, observer) {
  for (const zone of battle.zones) {
    for (const threat of zone.threats) {
      if (!threat.type.rangeAir) continue;

      const fireRange = threat.type.rangeAir + SAFETY_DISTANCE;

      if (calculateSquareDistance(threat.body, observer.body) <= fireRange * fireRange) {
        return true;
      }
    }
  }
}

function isTargetValid(battle, target) {
  if (target === battle.zone) {
    return true;
  } else if (target.tag) {
    // A unit target is valid only if it is a threat but is not visible
    return battle.zone.threats.has(target) && !battle.zone.enemies.has(target);
  } else if (target.cell) {
    // A zone target is valid only if...
    if ((battle.mode === Battle.MODE_FIGHT) || (battle.mode === Battle.MODE_MARCH) || (battle.mode === Battle.MODE_SMASH)) {
      // ... it's one of the neighbors but none of the battle lines
      return battle.zone.neighbors.has(target) && !battle.lines.some(line => (target === line.zone));
    } else {
      // ... it's one of the battle line zones
      return battle.lines.some(line => (target === line.zone));
    }
  }

  return target.zone && battle.zones.has(target.zone);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
