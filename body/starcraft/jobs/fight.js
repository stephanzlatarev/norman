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
    } else if (this.shouldRally()) {
      this.goRally();
      this.isDeployed = false;
      this.details = this.summary + " rallying";
    } else if (this.shouldEscape()) {
      this.goEscape();
      this.isDeployed = true;
      this.details = this.summary + " escaping";
    } else {
      orderMove(warrior, getRallyPoint(this.zone), 3);
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
        orderMove(warrior, target.body);
      } else if (this.station) {
        // Otherwise, step back to the assigned station
        orderMove(warrior, this.station, 3);
      } else {
        // Default to stepping back to the rally point
        orderMove(warrior, getRallyPoint(this.zone));
      }
    } else if (target.lastSeen < warrior.lastSeen) {
      if (isClose(warrior.body, target.body, 5)) {
        // Cannot hit this target. Either it's hidden and we don't have detection, or it's gone
        this.target.zone.threats.delete(target);
      } else {
        // Move closer to see the target so that warrior can attack it
        orderMove(warrior, target.body);
      }
    } else {
      orderAttack(warrior, target);
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

      orderMove(warrior, hop, 3);
    }
  }

  goEscape() {
    const battle = this.battle;
    const warrior = this.assignee;

    let route;

    if (warrior.zone === battle.zone) {
      // Escape through the closes corridor
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
      orderMove(warrior, route[0], 3);
    } else {
      new Order(warrior, 23, warrior.body);
    }
  }

  close(outcome) {
    orderStop(this.assignee);

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
        if (!isInThreatsRange(battle, warrior, neighbor)) return [corridor, neighbor];

        alternatives.push({ corridor: corridor, zone: neighbor });
      }
    }
  }

  for (const alternative of alternatives) {
    const route = findEscapeRoute(alternative.zone, skip, battle, warrior);

    if (route) return [alternative.corridor, alternative.zone, ...route];
  }
}

function orderAttack(warrior, enemy) {
  if (!warrior || !enemy) return;
  if (!warrior.type.damageGround && !warrior.type.damageAir) return;

  if ((warrior.order.abilityId !== 23) || (warrior.order.targetUnitTag !== enemy.tag)) {
    new Order(warrior, 23, enemy);
  }
}

function orderMove(warrior, pos, span) {
  if (!warrior || !warrior.order || !pos) return;
  if (isClose(warrior.body, pos, span || 1)) return; // Note that here it's OK if warrior has other orders as long as it's at the right position.

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isClose(warrior.order.targetWorldSpacePos, pos, 1)) {
    new Order(warrior, 16, pos);
  }
}

function orderStop(warrior) {
  if (!warrior) return;

  if (warrior.order.abilityId) {
    new Order(warrior, 3665).accept(true);
  }
}

function isClose(a, b, distance) {
  return (Math.abs(a.x - b.x) <= distance) && (Math.abs(a.y - b.y) <= distance);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
