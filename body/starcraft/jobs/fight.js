import Job from "../job.js";
import Order from "../order.js";
import Battle from "../battle/battle.js";
import { getHopRoute, getHopZone } from "../map/route.js";

const HOP_CLOSE_DISTANCE = 6;
const KITING_RANGE = 2;
const KITING_WARRIORS = new Set(["Stalker"]);

export default class Fight extends Job {

  constructor(battle, warrior, station) {
    super(warrior);

    this.battle = battle;
    this.zone = station.zone;
    this.station = station;
    this.summary = "Fight " + battle.zone.name;
    this.details = this.summary;
    this.isCommitted = false;
    this.isDeployed = false;

    battle.fighters.push(this);
  }

  updateBattle(battle) {
    this.battle = battle;
    this.summary = "Fight " + battle.zone.name;
    this.details = this.summary;
  }

  setStation(station) {
    if (station && station.zone) {
      this.zone = station.zone;
      this.station = station;
    }
  }

  accepts(unit) {
    if (!unit.zone || !this.battle.stations.length) {
      return false;
    } else if (this.battle.zones.has(unit.zone)) {
      // If already in the battle zone, the warrior must be closest to this fight's station rather than any other station of the battle
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
    const target = this.target;

    if (!warrior.isAlive) {
      console.log("Warrior", warrior.type.name, warrior.nick, "died in", this.details);
      this.details = getDetails(this, "dead");
      this.assignee = null;
      this.isCommitted = false;
      this.isDeployed = false;
      return;
    }

    const isAttacking = (warrior && target && warrior.order && (warrior.order.targetUnitTag === target.tag));

    this.isDeployed = isAttacking || this.battle.zones.has(warrior.zone);
    this.isCommitted = false;

    if (this.shouldAttack()) {
      this.details = getDetails(this, "attack");
      this.isCommitted = true;
      this.goAttack();
    } else if (!this.isDeployed) {
      this.details = getDetails(this, "deploy");
      this.goDeploy();
    } else if (this.shouldKite()) {
      this.details = getDetails(this, "kite");
      Order.attack(warrior, target);
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

    if (!warrior || !target) return false;
    if (target.lastSeen < warrior.lastSeen) return false;
    if (warrior.weapon.cooldown) return false;
    if (!KITING_WARRIORS.has(warrior.type.name)) return false;

    const squareDistance = calculateSquareDistance(warrior.body, target.body);

    if (target.body.isGround && warrior.type.rangeGround) {
      const squareRangeMax = warrior.type.rangeGround * warrior.type.rangeGround;
      const squareRangeMin = (warrior.type.rangeGround - KITING_RANGE) * (warrior.type.rangeGround - KITING_RANGE);

      return (squareDistance >= squareRangeMin) && (squareDistance <= squareRangeMax);
    } else if (target.body.isFlying && warrior.type.rangeAir) {
      const squareRangeMax = warrior.type.rangeAir * warrior.type.rangeAir;
      const squareRangeMin = (warrior.type.rangeAir - KITING_RANGE) * (warrior.type.rangeAir - KITING_RANGE);

      return (squareDistance >= squareRangeMin) && (squareDistance <= squareRangeMax);
    }
  }

  goAttack() {
    const warrior = this.assignee;
    const target = this.target;

    if (target.lastSeen < warrior.lastSeen) {
      if (isClose(warrior.body, target.body, 5)) {
        // Cannot hit this target. Either it's hidden and we don't have detection, or it's gone
        this.target.zone.threats.delete(target);
      } else {
        // Move closer to see the target so that warrior can attack it
        Order.move(warrior, target.body);
      }
    } else if (warrior.weapon.cooldown > 3) {
      const range = target.body.isFlying ? warrior.type.rangeAir : warrior.type.rangeGround;
      const distance = Math.sqrt(calculateSquareDistance(warrior.body, target.body));
      const closestDistanceOnReadyWeapon = distance + (target.type.movementSpeed - warrior.type.movementSpeed) * warrior.weapon.cooldown;
      const stationRange = Math.max(range, 5);

      if (closestDistanceOnReadyWeapon >= range - 1) {
        // Make sure warrior can walk to target and be within range at the moment the weapon is ready to fire
        Order.move(warrior, target.body);
        this.attackMoveForward = true;
      } else if (this.attackMoveForward && (closestDistanceOnReadyWeapon >= range - 2)) {
        // If just crossed the distance to be within range, move towards the target for a bit more
        Order.move(warrior, target.body);
        this.attackMoveForward = true;
      } else if (isClose(warrior.body, this.station, stationRange)) {
        // Step away to free room for other fighters
        const dx = (warrior.body.x > target.body.x) ? stationRange : -stationRange;
        const dy = (warrior.body.y > target.body.y) ? stationRange : -stationRange;

        Order.move(warrior, { x: warrior.body.x + dx, y: warrior.body.y + dy });
        this.attackForth = false;
      } else {
        // Otherwise, step back to the assigned station
        Order.move(warrior, this.station, Order.MOVE_CLOSE_TO);
        this.attackMoveForward = false;
      }
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
