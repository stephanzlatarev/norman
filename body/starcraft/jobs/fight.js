import Job from "../job.js";
import Order from "../order.js";
import Battle from "../battle/battle.js";
import { getHopRoute, getHopZone } from "../map/route.js";

const HOP_CLOSE_DISTANCE = 6;
const STATION_CLOSE_DISTANCE = 6;

export default class Fight extends Job {

  constructor(battle, warrior, station) {
    super(warrior);

    this.station = station;
    this.zone = station.zone;
    this.battle = battle;
    this.priority = battle.priority;
    this.summary += " " + battle.zone.name;
    this.details = this.summary;
    this.isCommitted = false;
    this.isDeployed = false;

    battle.fighters.push(this);
  }

  accepts(unit) {
    if (!unit.zone || !this.battle.stations.length) {
      return false;
    } else if (this.battle.zones.has(unit.zone)) {
      // When already in the battle zone, the warrior must be closest to this fight's station rather than any other station of the battle
      let closestStation;
      let closestDistance = Infinity;

      for (const station of this.battle.stations) {
        const distance = calculateSquareDistance(this.station, station);

        if (distance < closestDistance) {
          closestStation = station;
          closestDistance = distance;
        }
      }

      closestDistance = calculateSquareDistance(unit.body, closestStation);

      for (const station of this.battle.stations) {
        if (station === closestStation) continue;
        if (calculateSquareDistance(unit.body, station) < closestDistance) return false;
      }
    }

    return true;
  }

  execute() {
    const warrior = this.assignee;

    if (this.zone !== this.station.zone) this.zone = this.station.zone;

    this.isCommitted = false;
    this.isDeployed = this.battle.zones.has(warrior.zone) || isClose(warrior.body, this.station, STATION_CLOSE_DISTANCE);

    if (!warrior.isAlive) {
      console.log("Warrior", warrior.type.name, warrior.nick, "died in", this.details);
      this.details = getDetails(this, "dead");
      this.assignee = null;
      this.isDeployed = false;
    } else if (this.shouldAttack()) {
      this.details = getDetails(this, "attack");
      this.isCommitted = true;
      this.goAttack();
    } else if (!this.isDeployed) {
      this.details = getDetails(this, "deploy");
      this.goDeploy();
    } else if (this.shouldKite()) {
      this.details = getDetails(this, "kite");
      this.goKite();
    } else {
      this.details = getDetails(this, "station");
      Order.move(warrior, this.station, Order.MOVE_CLOSE_TO);
    }
  }

  shouldAttack() {
    const warrior = this.assignee;
    const mode = this.battle.mode;

    return warrior && this.target && ((mode === Battle.MODE_FIGHT) || (mode === Battle.MODE_SMASH)) && this.isDeployed;
  }

  shouldKite() {
    const warrior = this.assignee;
    const target = this.target;

    if (warrior && target && this.isDeployed) {
      if (target.body.isGround && warrior.type.rangeGround) {
        return isClose(warrior.body, target.body, warrior.type.rangeGround);
      } else if (target.body.isFlying && warrior.type.rangeAir) {
        return isClose(warrior.body, target.body, warrior.type.rangeAir);
      }
    }
  }

  goAttack() {
    const warrior = this.assignee;
    const target = this.target;

    if (warrior.weapon.cooldown) {
      // TODO: Do for ground or air range depending on the type of the target
      if (target.type.rangeGround > warrior.type.rangeGround) {
        // When target has larger range step towards it
        Order.move(warrior, target.body);
      } else {
        // Otherwise, step back to the assigned station
        Order.move(warrior, this.station, Order.MOVE_CLOSE_TO);
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

  goKite() {
    const warrior = this.assignee;
    const target = this.target;

    if (warrior.weapon.cooldown || (target.lastSeen < warrior.lastSeen)) {
      Order.move(warrior, this.station, Order.MOVE_CLOSE_TO);
    } else {
      Order.attack(warrior, target);
    }
  }

  goDeploy() {
    const warrior = this.assignee;
    const station = this.station;

    let hop;

    if (warrior.order.abilityId === 16) {
      const route = getHopRoute(warrior.cell, station);

      if (isOrderAlongRoute(warrior.order, route)) {
        // Warrior is already moving along the route
        return;
      } else {
        // Warrior is moving but not along the route. Correct move to the next hop in the route.
        hop = route[0];
      }
    } else {
      hop = getHopZone(warrior.cell, station);
    }

    if (!hop || isClose(warrior.body, hop, HOP_CLOSE_DISTANCE)) {
      hop = this.station;
    }

    Order.move(warrior, hop, Order.MOVE_CLOSE_TO);
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

function getDetails(fight, mode) {
  const details = ["Fight", fight.zone.name, ">", fight.battle.zone.name];
  const target = fight.target;

  if (target) {
    details.push(target.type.name + " " + target.nick);
  }

  details.push(mode);

  return details.join(" ");
}

function isOrderAlongRoute(order, route) {
  const pos = order.targetWorldSpacePos;

  if (pos) {
    for (const turn of route) {
      if (isClose(pos, turn, 1)) return true;
    }
  }
}

function isClose(a, b, distance) {
  return (Math.abs(a.x - b.x) <= distance) && (Math.abs(a.y - b.y) <= distance);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
