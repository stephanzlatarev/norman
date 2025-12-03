import Job from "../job.js";
import Order from "../order.js";
import Battle from "../battle/battle.js";
import Resources from "../memo/resources.js";

const KITING_RANGE = 2;
const KITING_WARRIORS = new Set(["Stalker"]);
const STALKING_BUFFER_RANGE = 1.2;
const REASSIGNABLE_WARRIORS = new Set(["Sentry"]);
const SQUARE_DISTANCE_BLOCKED_PATH = 1000 * 1000;

export default class Fight extends Job {

  constructor(battle, warrior, station) {
    super(warrior);

    this.battle = battle;
    this.zone = station.zone;
    this.station = station;
    this.summary = "Fight " + battle.front.name;
    this.details = this.summary;
    this.isBusy = false;
    this.isDeploying = false;

    battle.fighters.push(this);
  }

  updateBattle(battle) {
    this.battle = battle;
    this.summary = "Fight " + battle.front.name;
    this.details = this.summary;
  }

  setStation(station) {
    if (station && station.zone) {
      this.zone = station.zone;
      this.station = station;
    }
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
    const isDeployed = this.battle.sectors.has(warrior.sector);

    if ((isDeployed || isAttacking) && this.shouldAttack()) {
      // Attack

      if (this.target) {
        this.details = getDetails(this, "attack");
        this.goAttack();
      } else {
        this.details = getDetails(this, "charge");
        Order.attack(warrior, (this.station.zone === this.battle.front) ? this.station : this.battle.front.rally);
      }

      if (REASSIGNABLE_WARRIORS.has(warrior.type.name)) {
        this.isBusy = false;
      } else {
        this.isBusy = isAttacking;
      }

      this.isDeploying = false;
    } else if (isDeployed) {
      // Deployed but shouldn't attack yet

      if (this.shouldStalk()) {
        if (this.shouldKite()) {
          this.details = getDetails(this, "kite");
          Order.attack(warrior, target);
        } else {
          this.details = getDetails(this, "stalk");
          Order.move(warrior, this.station);
        }
      } else if (this.shouldMarch()) {
        this.details = getDetails(this, "march");
        this.goMarch();
      } else {
        this.details = getDetails(this, "station");

        if (this.battle.mode === Battle.MODE_STAND) {
          // There are no enemies nearby. Move to the station ready to leave room for buildings
          Order.move(warrior, this.station, Order.MOVE_NEAR_BY);
        } else {
          Order.hold(warrior, this.station);
        }
      }

      this.isBusy = false;
      this.isDeploying = false;
    } else {
      this.details = getDetails(this, "deploy");
      this.goDeploy();

      this.isBusy = false;
      this.isDeploying = true;
    }
  }

  shouldAttack() {
    const warrior = this.assignee;
    const mode = this.battle.mode;

    if (!warrior) return false;

    if (mode === Battle.MODE_FIGHT) return true;
    if (mode === Battle.MODE_SMASH) return true;
    if (mode === Battle.MODE_WEAR) return true;

    if ((mode === Battle.MODE_RALLY) && this.station.isHoldStation && (warrior.zone === this.station.zone)) return true;
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
    return this.assignee && (this.battle.mode === Battle.MODE_MARCH) && (this.target || (this.assignee.zone !== this.battle.front));
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
    return isInFireRange(target, warrior, STALKING_BUFFER_RANGE);
  }

  goAttack() {
    const warrior = this.assignee;
    const target = this.target;

    if (target.lastSeen < warrior.lastSeen) {
      if (isClose(warrior.body, target.body, 5)) {
        // Cannot hit this target. Either it's hidden and we don't have detection, or it's gone
        target.sector.clearThreat(target);
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
    } else if (shouldLeaveTarget(warrior, this.battle, this.station, target)) {
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

    // TODO: Calculate safe path and use this.isDeploying to hop through zones.
    // TODO: Recalculate if zones changed alert level.

    Order.move(warrior, station, Order.MOVE_CLOSE_TO);
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

      Order.move(warrior, this.target || this.battle.front.rally);
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
  const details = ["Fight", fight.zone.name, ">", fight.battle.front.name];
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

function shouldLeaveTarget(warrior, battle, station, target) {
  if (!station.isHoldStation) return false;
  if (battle.front !== station.zone) return false;
  if (!target.type.movementSpeed) return false;
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

// Check if the target is in the fire range of the warrior.
function isInFireRange(warrior, target, bufferRange = 0) {
  if (target.body.isGround && warrior.type.rangeGround) {
    return isInRange(warrior, target, warrior.type.rangeGround + bufferRange);
  } else if (target.body.isFlying && warrior.type.rangeAir) {
    return isInRange(warrior, target, warrior.type.rangeAir + bufferRange);
  }
}

function isInRange(warrior, target, range) {
  const squareDistance = calculateSquareDistance(warrior.body, target.body);
  const totalRange = warrior.body.r + range + target.body.r;
  const squareRange = totalRange * totalRange;

  return (squareDistance <= squareRange);
}

function isClose(a, b, distance) {
  return (Math.abs(a.x - b.x) <= distance) && (Math.abs(a.y - b.y) <= distance);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
