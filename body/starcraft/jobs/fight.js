import Job from "../job.js";
import Order from "../order.js";
import Battle from "../battle/battle.js";
import { getHopRoute, getHopZone } from "../map/route.js";
import Resources from "../memo/resources.js";

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
    if (!unit.zone || !this.battle.lines.length) {
      return false;
    } else if (this.battle.zones.has(unit.zone)) {
      // If already in the battle zone, the warrior must be closest to this fight's station's battle line rather than any other battle line
      const closestDistance = calculateSquareDistance(unit.body, this.zone);

      for (const line of this.battle.lines) {
        if (this.zone === line.zone) continue;
        if (calculateSquareDistance(unit.body, line.zone) < closestDistance) return false;
      }
    }

    return true;
  }
  
  distance(unit) {
    if (this.zone && unit && this.battle && !this.battle.hasRallyPoints()) {
      return calculateSquareDistance(unit.body, this.zone);
    }

    return super.distance(unit);
  }

  execute() {
    const warrior = this.assignee;
    const target = this.target;

    if (!warrior.isAlive) {
      console.log("Warrior", warrior.type.name, warrior.nick, "died in", this.details);
      this.details = getDetails(this, "dead");
      this.assignee = null;
      this.isCommitted = false;
      return;
    }

    const isAttacking = (warrior && target && warrior.order && (warrior.order.targetUnitTag === target.tag));
    const isDeployed = this.battle.zones.has(warrior.zone);

    this.isCommitted = false;

    if ((isDeployed || isAttacking) && this.shouldAttack()) {
      // Attack

      if (this.target) {
        this.details = getDetails(this, "attack");
        this.goAttack();
      } else {
        this.details = getDetails(this, "charge");
        Order.move(warrior, this.battle.zone);
      }

      this.isCommitted = true;
    } else if (isDeployed) {
      // Deployed but shouldn't attack yet

      if (this.shouldStalk()) {
        if (this.shouldKite()) {
          this.details = getDetails(this, "kite");
          Order.attack(warrior, target);
        } else {
          this.details = getDetails(this, "stalk");
          this.goStalk();
        }
      } else if (this.shouldMarch()) {
        this.details = getDetails(this, "march");
        this.goMarch();
      } else {
        this.details = getDetails(this, "station");
        Order.move(warrior, this.station, Order.MOVE_CLOSE_TO);
      }

    } else {
      this.details = getDetails(this, "deploy");
      this.goDeploy();
    }
  }

  shouldAttack() {
    const warrior = this.assignee;
    const mode = this.battle.mode;

    return warrior && ((mode === Battle.MODE_FIGHT) || (mode === Battle.MODE_SMASH));
  }

  shouldKite() {
    if (this.isKitingSuppressed) return false;

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

      if (squareDistance < squareRangeMin) this.isKitingSuppressed = true;
      if (squareDistance > squareRangeMax) this.isKitingSuppressed = false;

      return (squareDistance >= squareRangeMin) && (squareDistance <= squareRangeMax);
    } else if (target.body.isFlying && warrior.type.rangeAir) {
      const squareRangeMax = warrior.type.rangeAir * warrior.type.rangeAir;
      const squareRangeMin = (warrior.type.rangeAir - KITING_RANGE) * (warrior.type.rangeAir - KITING_RANGE);

      if (squareDistance < squareRangeMin) this.isKitingSuppressed = true;
      if (squareDistance > squareRangeMax) this.isKitingSuppressed = false;

      return (squareDistance >= squareRangeMin) && (squareDistance <= squareRangeMax);
    }
  }

  shouldMarch() {
    return this.assignee && (this.battle.mode === Battle.MODE_MARCH);
  }

  // Warrior should keep distance if it entered the fire range of the enemy or its shields are not full
  shouldStalk() {
    const warrior = this.assignee;
    const target = this.target;

    if (!warrior || !target) return false;

    // Check if the warrior is not at full shield.
    // It doesn't matter if it hasn't recovered from a previous fight or if it has been hit by an invisible enemy.
    // In both cases, the warrior should step back and recover
    if (warrior.armor.shield < warrior.armor.shieldMax) return true;

    // Check if the warrior is in the fire range of the target.
    const squareDistance = calculateSquareDistance(warrior.body, target.body);
    if (warrior.body.isGround && target.type.rangeGround) {
      const squareFireRange = target.type.rangeGround * target.type.rangeGround;

      return (squareDistance <= squareFireRange);
    } else if (warrior.body.isFlying && warrior.type.rangeAir) {
      const squareFireRange = target.type.rangeAir * target.type.rangeAir;

      return (squareDistance <= squareFireRange);
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
    } else if (shouldMoveToCoolDown(warrior)) { 
      const range = target.body.isFlying ? warrior.type.rangeAir : warrior.type.rangeGround;
      const distance = Math.sqrt(calculateSquareDistance(warrior.body, target.body)) - warrior.body.r - target.body.r;
      const closestDistanceOnReadyWeapon = distance + (target.type.movementSpeed - warrior.type.movementSpeed) * (warrior.weapon.cooldown - 3);
      const fireRangeDistance = Math.max(range, 5);

      if ((closestDistanceOnReadyWeapon > 0) && (closestDistanceOnReadyWeapon >= range - 1)) {
        // Make sure warrior can walk to target and be within range at the moment the weapon is ready to fire
        Order.move(warrior, target.body);
        this.attackMoveForward = true;
      } else if (this.attackMoveForward && (closestDistanceOnReadyWeapon > 0) && (closestDistanceOnReadyWeapon >= range - 2)) {
        // If just crossed the distance to be within range, move towards the target for a bit more
        Order.move(warrior, target.body);
        this.attackMoveForward = true;
      } else if (isClose(warrior.body, this.station, 3)) {
        // Step away to free room for other fighters
        const dx = (warrior.body.x > target.body.x) ? fireRangeDistance : -fireRangeDistance;
        const dy = (warrior.body.y > target.body.y) ? fireRangeDistance : -fireRangeDistance;

        Order.move(warrior, { x: target.body.x + dx, y: target.body.y + dy });
        this.attackMoveForward = false;
      } else {
        // Otherwise, step back to the assigned station
        Order.move(warrior, this.station, Order.MOVE_CLOSE_TO);
        this.attackMoveForward = false;
      }
    } else {
      Order.attack(warrior, target);
      this.attackMoveForward = false;
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
      hop = station;
    }

    Order.move(warrior, hop, Order.MOVE_CLOSE_TO);
  }

  goMarch() {
    const warrior = this.assignee;
    let marching = this.marching;

    if (marching && (Resources.loop - marching.loop < 4)) {
      const dx = (warrior.body.x - marching.lastx);
      const dy = (warrior.body.y - marching.lasty);

      marching.loop = Resources.loop;
      marching.lastx = warrior.body.x;
      marching.lasty = warrior.body.y;

      if (marching.isMarching) {
        marching.distance += Math.sqrt(dx * dx + dy * dy);
      }
    } else {
      marching = { loop: Resources.loop, isLeader: false, isMarching: true, distance: 0, lastx: warrior.body.x, lasty: warrior.body.y };
      this.marching = marching;
    }

    if (marching.distance > this.battle.marchingDistance) {
      this.details = getDetails(this, "spread");

      // Make sure the spread movement is not counted as marching
      marching.isMarching = false;

      Order.stop(warrior);
    } else {
      // Make sure the spread movement is counted as marching
      marching.isMarching = true;

      Order.move(warrior, this.target || this.battle.zone);
    }
  }

  // The warrior should go outside of fire range and stay there.
  // The logic here assumes the closest neighbor is outside fire range or at least
  goStalk() {
    const warrior = this.assignee;
    const target = this.target;
    const zone = warrior.zone;
    const wt = Math.sqrt(calculateSquareDistance(warrior.body, target.body));

    let safestNeighbor;
    let safestRatio = Infinity;

    for (const neighbor of zone.range.front) {
      const nt = Math.sqrt(calculateSquareDistance(target.body, neighbor));
      if (nt < 6) continue; // Avoid division by zero but also don't consider neighbors within fire range of enemy 

      const nw = Math.sqrt(calculateSquareDistance(warrior.body, neighbor));
      const ratio = (nw + wt) / nt;

      if (ratio < safestRatio) {
        safestNeighbor = neighbor;
        safestRatio = ratio;
      }
    }

    if (safestNeighbor) {
      Order.move(warrior, safestNeighbor);
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

function shouldMoveToCoolDown(warrior) {
  return (warrior.weapon.cooldown > 3) && (warrior.weapon.cooldown < warrior.type.weaponCooldown - 3);
}

function isClose(a, b, distance) {
  return (Math.abs(a.x - b.x) <= distance) && (Math.abs(a.y - b.y) <= distance);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
