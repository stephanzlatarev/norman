import Job from "../job.js";
import Order from "../order.js";
import Battle from "../battle/battle.js";
import { getHopZone } from "../map/route.js";
import Resources from "../memo/resources.js";

const KITING_RANGE = 2;
const KITING_WARRIORS = new Set(["Stalker"]);
const REASSIGNABLE_WARRIORS = new Set(["Sentry"]);
const SQUARE_DISTANCE_BLOCKED_PATH = 1000 * 1000;

export default class Fight extends Job {

  constructor(battle, warrior, station) {
    super(warrior);

    this.battle = battle;
    this.zone = station.zone;
    this.station = station;
    this.summary = "Fight " + battle.zone.name;
    this.details = this.summary;
    this.isBusy = false;
    this.hopping = false;

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

    const distance = super.distance(unit);

    if ((distance === Infinity) && (this.priority === 100)) {
      // Priority 100 means this is the focus battle.
      // All warriors must be considered for this battle.
      // Add 1000 to the distance to make sure warriors with safe path are prioritized.
      return SQUARE_DISTANCE_BLOCKED_PATH + calculateSquareDistance(unit.body, this.zone);
    }

    return distance;
  }

  execute() {
    const warrior = this.assignee;
    const target = this.target;

    if (!warrior.isAlive) {
      console.log("Warrior", warrior.type.name, warrior.nick, "died in", this.details);
      this.details = getDetails(this, "dead");
      this.assignee = null;
      this.isBusy = false;
      return;
    }

    const isAttacking = (warrior && target && warrior.order && (warrior.order.targetUnitTag === target.tag));
    const isDeployed = this.battle.zones.has(warrior.zone);

    if ((isDeployed || isAttacking) && this.shouldAttack()) {
      // Attack

      if (this.target) {
        this.details = getDetails(this, "attack");
        this.goAttack();
      } else {
        this.details = getDetails(this, "charge");
        new Order(warrior, 23, (this.station.zone === this.battle.zone) ? this.station : this.battle.zone.rally).accept(true);
      }

      if (REASSIGNABLE_WARRIORS.has(warrior.type.name)) {
        this.isBusy = false;
      } else {
        this.isBusy = isAttacking;
      }

      this.hopping = false;
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
        Order.move(warrior, this.station, (this.battle.mode !== Battle.MODE_STAND) ? Order.MOVE_CLOSE_TO : Order.MOVE_NEAR_BY);
      }

      this.isBusy = false;
      this.hopping = false;
    } else {
      this.details = getDetails(this, "deploy");
      this.goDeploy();

      this.isBusy = false;
    }
  }

  shouldAttack() {
    const warrior = this.assignee;
    const mode = this.battle.mode;

    return warrior && ((mode === Battle.MODE_FIGHT) || (mode === Battle.MODE_SMASH) || (mode === Battle.MODE_WEAR));
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
    return this.assignee && (this.battle.mode === Battle.MODE_MARCH) && (this.target || (this.assignee.zone !== this.battle.zone));
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
    } else if (shouldRegenerateShields(warrior, this.battle, this.station)) {
      // Regenerate shields
      Order.move(warrior, this.station, Order.MOVE_CLOSE_TO);
      this.attackMoveForward = false;
    } else if (!this.station.isHoldStation && shouldMoveToCoolDown(warrior)) {
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
    } else if (shouldLeaveTarget(warrior, this.station, target)) {
      Order.move(warrior, this.station);
      this.attackMoveForward = false;
    } else {
      Order.attack(warrior, target);
      this.attackMoveForward = false;
    }
  }

  goDeploy() {
    const warrior = this.assignee;
    const station = this.station;

    // Make sure pecularities in the map don't make the warrior hop back and forth between two zones
    // When the warrior starts a hop to another zone, it should reach it before changing course
    if (this.hopping && (this.hopping.to === station.zone) && (warrior.zone !== this.hopping.via) && (this.hopping.via.alertLevel <= this.hopping.alertLevel)) {
      this.details += " hopping to " + this.hopping.to.name + " via " + this.hopping.via.name;
      return Order.move(warrior, this.hopping.via, Order.MOVE_CLOSE_TO);
    }

    const hop = getHopZone(warrior.cell, station);

    if (hop) {
      this.hopping = { via: hop, to: station.zone, alertLevel: hop.alertLevel };
      Order.move(warrior, hop.rally, Order.MOVE_CLOSE_TO);
    } else {
      this.hopping = false;
      Order.move(warrior, station, Order.MOVE_CLOSE_TO);
    }
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

      Order.move(warrior, this.target || this.battle.zone.rally);
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

function shouldMoveToCoolDown(warrior) {
  return (warrior.weapon.cooldown > 3) && (warrior.weapon.cooldown < warrior.type.weaponCooldown - 3);
}

function shouldLeaveTarget(warrior, station, target) {
  if (!station.isHoldStation) return false;
  if ((warrior.zone === station.zone) && warrior.cell.isPlot) return false;

  const squareDistance = calculateSquareDistance(warrior.body, target.body);
  const range = warrior.body.r + (target.body.isFlying ? warrior.type.rangeAir : warrior.type.rangeGround) + target.body.r;
  const squareRange = range * range;

  return (squareDistance > squareRange);
}

function shouldRegenerateShields(warrior, battle, station) {
  if (battle.mode !== Battle.MODE_WEAR) return false;
  if (station.isHoldStation) return false;

  if (warrior.hasRegeneratedShields && warrior.weapon.cooldown && (warrior.armor.shield < warrior.armor.shieldMax)) {
    // Warrior has been hit after regenerating shields and firing a weapon.
    warrior.hasRegeneratedShields = false;
    return true;
  }

  if (!warrior.weapon.cooldown && (warrior.armor.shield >= warrior.armor.shieldMax)) {
    // Warrior has regenerated shields and is ready to fire.
    warrior.hasRegeneratedShields = true;
  }

  return !warrior.hasRegeneratedShields;
}

function isClose(a, b, distance) {
  return (Math.abs(a.x - b.x) <= distance) && (Math.abs(a.y - b.y) <= distance);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
