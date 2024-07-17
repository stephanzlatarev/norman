import Job from "../job.js";
import Order from "../order.js";
import Battle from "../battle/battle.js";

// TODO: Make sure rally move doesn't go through threat zones
export default class Detect extends Job {

  constructor(battle) {
    super("Observer");

    this.priority = 0;
    this.zone = battle.zone;
    this.details = this.summary + " " + battle.zone.name;

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

    if (observer.armor.shield < this.shield) {
      this.stayAlive();
    } else if (mode === Battle.MODE_FIGHT) {
      this.supportArmy();
    } else if (!this.battle.frontline.zones.has(observer.zone)) {
      // Rally to battle zone
      orderMove(observer, this.zone);
    } else {
      this.observeZone();
    }

    this.shield = observer.armor.shield;
  }

  stayAlive() {
    const observer = this.assignee;
    const body = observer.body;

    // Play safe and move along the air frontline
    let bestPosition;
    let bestDistance = Infinity;

    // TODO: Replace this with airToAir and airToGround
    for (const position of this.battle.frontline.groundToGround) {
      const distance = Math.abs(position.x - body.x) + Math.abs(position.y - body.y);

      if (distance < bestDistance) {
        bestPosition = position;
        bestDistance = distance;
      }
    }
    for (const position of this.battle.frontline.groundToAir) {
      const distance = Math.abs(position.x - body.x) + Math.abs(position.y - body.y);

      if (distance < bestDistance) {
        bestPosition = position;
        bestDistance = distance;
      }
    }

    orderMove(observer, bestPosition);
  }

  supportArmy() {
    // Stay with the army. Cover as much area as possible
    this.observeZone();
  }

  observeZone() {
    // If there are detectors and air shooters move along the air frontline
    // Else cover as much area as possible
    // Beware scans from orbital command centers. Don't stay within range of air shooters for too long
    const observer = this.assignee;
    const observerBody = observer.body;
    const threats = this.zone.threats;

    let closestThreatBody;
    let closestDistance = Infinity;

    for (const threat of threats) {
      if (threat.lastSeen < observer.lastSeen) {
        const threatBody = threat.body;
        const distance = Math.abs(threatBody.x - observerBody.x) + Math.abs(threatBody.y - observerBody.y);
  
        if (distance < closestDistance) {
          closestThreatBody = threatBody;
          closestDistance = distance;
        }
      }
    }

    if (closestThreatBody) {
      orderMove(observer, closestThreatBody);
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
