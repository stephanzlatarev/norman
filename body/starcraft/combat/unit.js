import Exposures from "./exposures.js";
import Mobility from "./mobility.js";
import Pulse from "./pulse.js";
import { SPEED, RANGE, DAMAGE, DAMAGE_PER_STEP, IS_MILITARY, LOOPS_PER_STEP, STEPS_PER_SECOND } from "../units.js";

const CHARGE_ATTRACT = -1;
const CHARGE_REPEL = 1;
const DISTANCE_SUPPORT = 0.2;
const DISTANCE_OBSTACLE = 1;

const SENTRY_COOLDOWN = 0.71 / STEPS_PER_SECOND;
const ZEALOT_COOLDOWN = 13.2 + LOOPS_PER_STEP;

//TODO:
//- limit melee warriors to 4, if this is not taken care of by suppressing engagement when there is obstacle in the way
//- add Unit.headshot to mark if warriors can kill the unit with one shot each.
//  If so, make everyone wait within range and move everyone out of range within range until everyone is in range.
//  Then issue attack command to all.
//- can we calculate waves of hits, so that warriors are distributed to kill enemies in 2 or more waves

export default class Unit {

  constructor(unit, type) {
    this.tag = unit.tag;
    this.type = type;

    sync(this, unit);

    this.pulses = [];

    if (type === "warrior") {
      this.pulses.push(new Pulse(this, always, CHARGE_REPEL, DISTANCE_SUPPORT));
    } else if (type === "enemy") {
      this.pulses.push(new Pulse(this, always, CHARGE_ATTRACT));
      this.pulses.push(new Pulse(this, duringCooldown, CHARGE_REPEL, (unit) => Math.max(unit.range - 1, 0)));
    } else if (type === "obstacle") {
      this.pulses.push(new Pulse(this, always, CHARGE_REPEL, DISTANCE_OBSTACLE));
    }

    if ((type === "warrior") && (this.range < 1)) {
      this.mobility = new Mobility(this);
    } else if (type === "enemy") {
      this.exposures = new Exposures(this);
    }
  }

  sync(units) {
    const unit = units.get(this.tag);

    if (unit) {
      sync(this, unit);
    } else {
      this.isDead = true;
    }

    return !!unit;
  }

}

function sync(image, unit) {
  image.isBusy = unit.isBusy;
  image.isSelected = unit.isSelected;
  image.pos = { x: unit.pos.x, y: unit.pos.y };
  image.radius = unit.radius;
  image.unitType = unit.unitType;
  image.order = unit.orders.length ? unit.orders[0] : { abilityId: 0 };
  image.health = unit.health + unit.shield;

  image.isMilitary = !!IS_MILITARY[unit.unitType];
  image.damage = DAMAGE[unit.unitType];
  image.dps = DAMAGE_PER_STEP[unit.unitType];
  image.speed = SPEED[unit.unitType];
  image.range = RANGE[unit.unitType];
  image.cooldown = weaponTime(unit);
}

function weaponTime(unit) {
  if (unit.unitType === 73) {
    // Zealots have two hits
    return (unit.weaponCooldown >= ZEALOT_COOLDOWN) ? 0 : unit.weaponCooldown / LOOPS_PER_STEP;
  } else if (unit.unitType === 77) {
    // Sentries lock on target with negative weapon cooldown
    return (unit.weaponCooldown < 0) ? SENTRY_COOLDOWN : unit.weaponCooldown / LOOPS_PER_STEP;
  }

  return Math.max(unit.weaponCooldown / LOOPS_PER_STEP, 0);
}

function always() {
  return true;
}

function duringCooldown(unit) {
  return (unit.cooldown > 0);
}
