import Job from "../job.js";
import Order from "../order.js";
import Battle from "../battle/battle.js";
import { ALERT_WHITE } from "../map/alert.js";

const SAFETY_DISTANCE = 3;

export default class Detect extends Job {

  constructor(battle) {
    super("Observer");

    this.priority = 0;
    this.zone = battle.zone;
    this.details = this.summary + " " + battle.zone.name;
    this.isCommitted = false;

    this.battle = battle;
    this.shield = 0;
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

    if ((observer.armor.shield < this.shield) || isInEnemyFireRange(this.battle, observer)) {
      this.stayAlive();
    } else if (!this.battle.zones.has(observer.zone)) {
      // Rally to battle zone
      // TODO: Make sure rally move doesn't go through threat zones
      orderMove(observer, this.zone);
    } else {
      this.observeZone();
    }

    this.isCommitted = (mode === Battle.MODE_FIGHT) || (mode === Battle.MODE_SMASH);
    this.shield = observer.armor.shield;
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
      orderMove(observer, { x: observer.body.x + Math.sign(observer.body.x - closestEnemy.body.x), y: observer.body.y + Math.sign(observer.body.y - closestEnemy.body.y) });
    }
  }

  observeZone() {
    const observer = this.assignee;
    const order = observer.order;

    const visible = new Set(this.battle.zone.enemies.values());
    const targets = [];

    for (const one of this.battle.zone.threats.values()) {
      if (!visible.has(one)) {
        targets.push(one.body);
      }
    }

    if (order.abilityId === 16) {
      const destinations = [...this.battle.zones, ...targets];

      if (!destinations.find(destination => isSamePosition(observer.body, destination))) {
        orderMove(observer, targets.length ? targets[0] : this.battle.zone);
      }
    } else if (isSamePosition(observer.body, this.zone)) {
      orderMove(observer, selectRandomRallyZone(this.battle));
    } else {
      orderMove(observer, this.zone);
    }
  }

  close(outcome) {
    orderStop(this.assignee);

    super.close(outcome);
  }
}

function orderMove(observer, pos) {
  if (!observer || !observer.order || !pos) return;
  if (!observer.order.abilityId && isCloseTo(observer.body, pos)) return;

  if ((observer.order.abilityId !== 16) || !observer.order.targetWorldSpacePos || !isSamePosition(observer.order.targetWorldSpacePos, pos)) {
    new Order(observer, 16, { x: pos.x, y: pos.y });
  }
}

function orderStop(observer) {
  if (!observer) return;

  if (observer.order.abilityId) {
    new Order(observer, 3665).accept(true);
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) <= 6) && (Math.abs(a.y - b.y) <= 6);
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

function selectRandomRallyZone(battle) {
  const zones = [...battle.zones].filter(zone => ((zone !== battle.zone) && (zone.alertLevel <= ALERT_WHITE)));
  const selection = Math.floor(zones.length * Math.random());

  return zones[selection];
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
