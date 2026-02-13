import { Job, Order } from "./imports.js";
import Battle from "./battle.js";

const SAFETY_DISTANCE = 3;
const LOOPS_LIMIT_DIRECTION = 10 * 22.4; // Limit of ten seconds to reach next target when observing the battle zone

export default class Detect extends Job {

  constructor(battle) {
    super("Observer");

    this.battle = battle;
    this.zone = battle.front;
    this.details = "Detect " + battle.front.name;
    this.isBusy = false;

    this.shield = 0;
    this.loopsInDirection = 0;
  }

  updateBattle(battle) {
    this.battle = battle;
    this.zone = battle.front;

    this.summary = "Detect " + battle.front.name;
    this.details = this.summary;
  }

  execute() {
    const observer = this.assignee;
    const mode = this.battle.mode;
    const isBattleInAttackMode = (mode === Battle.MODE_FIGHT) || (mode === Battle.MODE_MARCH) || (mode === Battle.MODE_SMASH) || (mode === Battle.MODE_WEAR);

    clearDetectedThreats(observer);

    const invisibleThreat = findClosestInvisibleThreat(observer, this.battle.sectors);

    if ((observer.armor.shield >= observer.armor.shieldMax) && invisibleThreat) {
      // All threats may be outside sight range, so the observer may need to get into their fire range if necessary. That's why do it on full shield.
      this.target = invisibleThreat;
    } else if ((observer.armor.shield < this.shield) || isInEnemyFireRange(this.battle, observer)) {
      this.target = getRetreatPoint(observer, this.battle);
    } else if (!this.battle.sectors.has(observer.sector)) {
      // Rally to battle
      // TODO: Make sure rally move doesn't go through threat zones
      this.target = this.battle.front;
    } else if (!shouldChangeTarget(observer, this.target, this.loopsInDirection, this.battle)) {
      // Should not change target
    } else if (invisibleThreat) {
      this.target = invisibleThreat;
      this.loopsInDirection = 0;
    } else {
      this.target = selectObserveDirection(this.battle, this.target);
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

function clearDetectedThreats(observer) {
  for (const sector of [observer.sector, ...observer.sector.neighbors]) {
    for (const threat of sector.threats) {
      if (!sector.enemies.has(threat) && isInSight(observer, threat.body)) {
        sector.clearThreat(threat);
      }
    }
  }
}

function shouldChangeTarget(observer, target, loopsInDirection, battle) {
  if (!target) return true;
  if (loopsInDirection > LOOPS_LIMIT_DIRECTION) return true;
  if (isSamePosition(observer.body, target)) return true;
  if (!isTargetValid(battle, target)) return true;

  return false;
}

function selectObserveDirection(battle, previousTarget) {
  if (!previousTarget) return battle.front;

  // Alternate between observing nearby sectors and observing the battle front
  if (previousTarget !== battle.front) return battle.front;

  let candidates;

  if (battle.sectors.size > 1) {
    candidates = [...battle.sectors].filter(sector => (sector !== battle.front.sector));
  } else {
    candidates = [...battle.front.border];
  }

  return candidates[Math.floor(candidates.length * Math.random())];
}

function findClosestInvisibleThreat(observer, sectors) {
  let closestThreat;
  let closestDistance = Infinity;

  for (const sector of sectors) {
    for (const threat of sector.threats) {
      if (sector.enemies.has(threat)) continue;

      const distance = calculateSquareDistance(observer.body, threat.body);

      if (distance < closestDistance) {
        closestThreat = threat;
        closestDistance = distance;
      }
    }
  }

  return closestThreat;
}

function getRetreatPoint(observer, battle) {
  let closestEnemy;
  let closestDistance = Infinity;

  for (const sector of battle.sectors) {
    for (const threat of sector.threats) {
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

  // Else, move to the rally point
  return battle.rally;
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
  for (const sector of battle.sectors) {
    for (const threat of sector.threats) {
      if (!threat.type.rangeAir) continue;

      const fireRange = threat.type.rangeAir + SAFETY_DISTANCE;

      if (calculateSquareDistance(threat.body, observer.body) <= fireRange * fireRange) {
        return true;
      }
    }
  }
}

function isTargetValid(battle, target) {
  if (target === battle.front) {
    return true;
  } else if (target.sector) {
    // A unit target is valid only if it is a threat but is not visible
    const sector = target.sector;

    return sector.threats.has(target) && !sector.enemies.has(target);
  }

  return battle.sectors.has(target);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
