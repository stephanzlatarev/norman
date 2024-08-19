import Job from "../job.js";
import Order from "../order.js";
import Battle from "../battle/battle.js";
import { ALERT_WHITE } from "../map/alert.js";
import { getHopRoute, getHopZone } from "../map/route.js";

export default class Fight extends Job {

  constructor(battle, warrior, rally) {
    super(warrior);

    this.zone = rally;
    this.battle = battle;
    this.priority = battle.priority;
    this.summary += " " + battle.zone.name;
    this.details = this.summary;
    this.isCommitted = false;
    this.isDeployed = false;

    battle.fighters.push(this);
  }

  direct(target, station) {
    this.target = target;
    this.station = station;
  }

  accepts(unit) {
    if (!unit.zone) {
      return false;
    } else if (this.battle.zones.has(unit.zone)) {
      // When already in the battle zone, the warrior must be closest to the rally point rather than any other corridor to the battle zone
      let rallyCorridor;
      let rallyDistance = Infinity;

      for (const corridor of this.battle.zone.corridors) {
        const distance = calculateSquareDistance(this.zone, corridor);

        if (distance < rallyDistance) {
          rallyCorridor = corridor;
          rallyDistance = distance;
        }
      }

      rallyDistance = calculateSquareDistance(unit.body, rallyCorridor);

      for (const corridor of this.battle.zone.corridors) {
        if (corridor === rallyCorridor) continue;
        if (calculateSquareDistance(unit.body, corridor) < rallyDistance) return false;
      }
    }

    return true;
  }

  execute() {
    const warrior = this.assignee;
    const isAttacking = this.shouldAttack();

    if (!warrior.isAlive) {
      console.log("Warrior", warrior.type.name, warrior.nick, "died in", this.details);
      this.assignee = null;
      this.isDeployed = false;
      this.details = this.summary + " dead";
    } else if (isAttacking) {
      this.goAttack();
      this.isDeployed = true;
      this.details = this.summary + " attacking";
    } else if (this.shouldEscape()) {
      this.goEscape();
      this.isDeployed = true;
      this.details = this.summary + " escaping";
    } else if (this.shouldRally()) {
      this.goRally();
      this.isDeployed = false;
      this.details = this.summary + " rallying";
    } else {
      Order.move(warrior, getRallyPoint(this.zone), Order.MOVE_CLOSE_TO);
      this.isDeployed = this.battle.zones.has(warrior.zone);
      this.details = this.summary + (this.isDeployed ? " deployed" : " deploying");
    }

    this.isCommitted = isAttacking;
  }

  shouldAttack() {
    const warrior = this.assignee;
    const mode = this.battle.mode;

    return warrior && warrior.isAlive && this.target && ((mode === Battle.MODE_FIGHT) || (mode === Battle.MODE_SMASH)) && this.battle.zones.has(warrior.zone);
  }

  shouldRally() {
    return !this.battle.zones.has(this.assignee.zone);
  }

  shouldEscape() {
    return isInThreatsRange(this.battle, this.assignee, this.assignee.body);
  }

  goAttack() {
    const warrior = this.assignee;
    const target = this.target;

    if (warrior.weapon.cooldown) {
      // TODO: Do for ground or air range depending on the type of the target
      if (target.type.rangeGround > warrior.type.rangeGround) {
        // When target has larger range step towards it
        Order.move(warrior, target.body);
      } else if (this.station) {
        // Otherwise, step back to the assigned station
        Order.move(warrior, this.station, Order.MOVE_CLOSE_TO);
      } else {
        // Default to stepping back to the rally point
        Order.move(warrior, getRallyPoint(this.zone));
      }
    } else if (target.lastSeen < warrior.lastSeen) {
      if (isClose(warrior.body, target.body, 5)) {
        // Cannot hit this target. Either it's hidden and we don't have detection, or it's gone
        this.target.zone.threats.delete(target);
      } else {
        // Move closer to see the target so that warrior can attack it
        Order.move(warrior, target.body);
      }
    } else {
      Order.attack(warrior, target);
    }
  }

  goRally() {
    const warrior = this.assignee;
    const rally = this.zone;

    let isMovingAlongRoute = false;
    let hop;

    if (warrior.order.abilityId === 16) {
      const route = getHopRoute(warrior.cell, rally.cell);

      if (isOrderAlongRoute(warrior.order, route)) {
        isMovingAlongRoute = true;
      } else {
        hop = route[0];
      }
    } else {
      hop = getHopZone(warrior.cell, rally.cell);
    }

    if (!isMovingAlongRoute) {
      if (!hop || isClose(warrior.body, hop, 3)) {
        hop = getRallyPoint(rally);
      }

      Order.move(warrior, hop, Order.MOVE_CLOSE_TO);
    }
  }

  goEscape() {
    const battle = this.battle;
    const warrior = this.assignee;

    let route;

    if (warrior.zone === battle.zone) {
      // Escape through the closest corridor
      route = findEscapeRoute(battle.zone, new Set(), battle, warrior);
    } else if (warrior.zone == this.zone) {
      // Escape through any corridor to a safe neighbor
      route = findEscapeRoute(this.zone, new Set(), battle, warrior);
    } else {
      // Escape to any safe zone and change rally point if necessary
      route = findEscapeRoute(warrior.zone, new Set(), battle, warrior);
      // TODO: Change the zone of the fight if necessary
    }

    if (route && route.length) {
      Order.move(warrior, getRallyPoint(route[0]), Order.MOVE_CLOSE_TO);
    } else {
      new Order(warrior, 23, warrior.body);
    }
  }

  close(outcome) {
    Order.stop(this.assignee);

    const index = this.battle.fighters.indexOf(this);
    if (index >= 0) {
      this.battle.fighters.splice(index, 1);
    }

    super.close(outcome);
  }

}

function getRallyPoint(zone) {
  return zone.isDepot ? zone.exitRally : zone;
}

function isOrderAlongRoute(order, route) {
  const pos = order.targetWorldSpacePos;

  if (pos) {
    for (const turn of route) {
      if (isClose(pos, turn, 1)) return true;
    }
  }
}

function isInThreatsRange(battle, warrior, pos) {
  for (const zone of battle.zones) {
    for (const threat of zone.threats) {
      if (!threat.type.rangeGround) continue; // TODO: Add range for spell casters

      const fireRange = threat.type.rangeGround + 2;
      const runRange = (threat.type.movementSpeed > warrior.type.movementSpeed) ? warrior.type.sightRange - 1 : 0;
      const escapeRange = Math.max(fireRange, runRange);

      if (calculateSquareDistance(threat.body, pos) <= escapeRange * escapeRange) {
        return threat;
      }
    }
  }
}

function findEscapeRoute(zone, skip, battle, warrior) {
  const alternatives = [];

  skip.add(zone);

  for (const corridor of zone.corridors) {
    for (const neighbor of corridor.zones) {
      if ((neighbor.alertLevel <= ALERT_WHITE) && !skip.has(neighbor)) {
        const neighborRallyPoint = getRallyPoint(neighbor);

        if (!isInThreatsRange(battle, warrior, neighborRallyPoint)) {
          if (isClose(warrior.body, neighborRallyPoint, 3)) {
            alternatives.push({ corridor: corridor, zone: neighbor });
          } else if (isClose(warrior.body, corridor, 3)) {
            return [neighbor];
          } else {
            return [corridor, neighbor];
          }
        } else {
          alternatives.push({ corridor: corridor, zone: neighbor });
        }
      }
    }
  }

  for (const alternative of alternatives) {
    const nextRoute = findEscapeRoute(alternative.zone, skip, battle, warrior);

    if (nextRoute) {
      const fullRoute = [alternative.corridor, alternative.zone, ...nextRoute];

      // If warrior is already close to one of the points in the route, then return only the following points
      for (let i = fullRoute.length - 1; i >= 0; i--) {
        if (isClose(warrior.body, getRallyPoint(fullRoute[i]), 3)) {
          return fullRoute.slice(i + 1);
        }
      }

      return fullRoute;
    }
  }
}

function isClose(a, b, distance) {
  return (Math.abs(a.x - b.x) <= distance) && (Math.abs(a.y - b.y) <= distance);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
