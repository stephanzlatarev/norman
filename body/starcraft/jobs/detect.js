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

    for (const threat of threats) {
      if ((threat.lastSeen < observer.lastSeen) && isInSight(observer, threat.body)) {
        threats.delete(threat);
      }
    }

    if ((observer.armor.shield >= observer.armor.shieldMax) && threats.size && !this.zone.enemies.size) {
      // All threats may be outside sight range, so the observer may need to get into their fire range if necessary. That's why do it on full shield.
      Order.move(observer, findClosestInvisibleThreat(observer, threats));
    } else if ((observer.armor.shield < this.shield) || isInEnemyFireRange(this.battle, observer)) {
      this.stayAlive();
    } else if (!this.battle.zones.has(observer.zone)) {
      // Rally to battle zone
      // TODO: Make sure rally move doesn't go through threat zones
      Order.move(observer, this.zone);
    } else {
      this.observeZone();
    }

    this.isBusy = (mode === Battle.MODE_FIGHT) || (mode === Battle.MODE_SMASH);
    this.shield = observer.armor.shield;
    this.loopsInDirection++;
  }

  stayAlive() {
    const observer = this.assignee;

    let closestEnemy;
    let closestDistance = Infinity;

    for (const zone of this.battle.zones) {
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

    if (closestEnemy) {
      // Move in the opposite direction
      const dx = Math.sign(observer.body.x - closestEnemy.body.x) * 2;
      const dy = Math.sign(observer.body.y - closestEnemy.body.y) * 2;

      Order.move(observer, { x: observer.body.x + dx, y: observer.body.y + dy });
    }
  }

  observeZone() {
    const observer = this.assignee;

    // Check if direction should be changed
    if (!this.target || (this.loopsInDirection > LOOPS_LIMIT_DIRECTION) || isSamePosition(observer.body, this.target) || !isTargetValid(this.battle, this.target)) {
      if (!this.target) {
        this.target = this.zone;
      } else if ((this.loopsInDirection < LOOPS_LIMIT_DIRECTION) && (this.zone.threats.size > this.zone.enemies.size)) {
        this.target = findClosestInvisibleThreat(observer, this.zone.threats, this.zone.enemies);
      } else if (this.target === this.zone) {
        this.target = this.battle.lines[Math.floor(this.battle.lines.length * Math.random())].zone;
      } else {
        this.target = this.zone;
      }

      this.loopsInDirection = 0;
    }

    if (this.target) {
      Order.move(observer, this.target);
    }
  }

  close(outcome) {
    if (this.isDone || this.isFailed) return;

    Order.stop(this.assignee);

    super.close(outcome);
  }
}

function findClosestInvisibleThreat(observer, threats, visible) {
  let closestThreat;
  let closestDistance = Infinity;

  for (const threat of threats) {
    if (visible && visible.has(threat)) continue;

    const distance = calculateSquareDistance(observer.body, threat.body);

    if (distance < closestDistance) {
      closestThreat = threat;
      closestDistance = distance;
    }
  }

  return closestThreat;
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
      const fireRange = threat.type.rangeAir + SAFETY_DISTANCE;

      if (calculateSquareDistance(threat.body, observer.body) <= fireRange * fireRange) {
        return true;
      }
    }
  }
}

function isTargetValid(battle, target) {
  if (target.tag) {
    // Target is valid if it is a threat but is not visible
    return battle.zone.threats.has(target) && battle.zone.enemies.has(target);
  } else {
    // Target is valid if it is either the battle zone or one of the battle line zones
    return (target === battle.zone) || !!battle.lines.find(line => (target === line.zone));
  }
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
