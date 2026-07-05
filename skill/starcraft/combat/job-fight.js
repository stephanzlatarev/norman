import { Job, Order, Resources, ALERT_RED, PERIMETER_WHITE } from "./imports.js";
import Battle from "./battle.js";

const KITING_RANGE = 2;
const KITING_WARRIORS = new Set(["Stalker"]);
const STALKING_BUFFER_RANGE = 1.2;
const CHECKIN_DISTANCE = 5;
const REASSIGNABLE_WARRIORS = new Set(["Sentry"]);

export default class Fight extends Job {

  checkin = null; // Current check-in zone. Warrior checks in when arriving at the fighter station
  transit = null; // Current transit zone

  constructor(battle, warrior, station) {
    super(warrior);

    this.battle = battle;
    this.zone = station.zone;
    this.station = station;
    this.summary = "Fight " + battle.front.name;
    this.details = this.summary;
    this.isBusy = false;

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
      this.transit = null;
      return;
    }

    if (this.checkin) {
      // Clear check-in if station zone changed
      if (this.station.zone !== this.checkin) this.checkin = null;
    } else {
      // Set check-in if warrior arrived at station zone
      if (isClose(warrior.body, this.station, CHECKIN_DISTANCE)) this.checkin = this.station.zone;
    }

    const isAttacking = (warrior && target && warrior.order && (warrior.order.targetUnitTag === target.tag));
    const isDeployed = this.battle.sectors.has(warrior.sector);
    let isInTransit = false;

    if ((isDeployed || isAttacking) && this.shouldAttack()) {
      // Attack
      let destination;

      if (target) {
        destination = target.cell;
      } else if (this.station.zone === this.battle.front) {
        destination = this.station;
      } else {
        destination = this.battle.front.rally;
      }

      const isStationOutsidePerimeter = (this.station.zone.perimeterLevel >= PERIMETER_WHITE);
      const hasCheckedIn = (this.checkin === this.station.zone);
      const shouldCheckIn = isStationOutsidePerimeter && !hasCheckedIn;

      if (!isDeployed || shouldCheckIn) {
        this.details = getDetails(this, "approach");
        this.goRouteTo(this.station);

        isInTransit = true;
        this.isBusy = false;
      } else if (target) {
        this.details = getDetails(this, "attack");
        this.goAttack();

        if (REASSIGNABLE_WARRIORS.has(warrior.type.name)) {
          this.isBusy = isInFireRange(target, warrior);
        } else {
          this.isBusy = isAttacking || isInFireRange(target, warrior);
        }
      } else {
        this.details = getDetails(this, "charge");
        Order.attack(warrior, destination);

        this.isBusy = false;
      }
    } else if (isDeployed) {
      // Deployed but shouldn't attack yet
      if (this.shouldStalk()) {
        if (this.shouldKite()) {
          this.details = getDetails(this, "kite");
          Order.attack(warrior, target);
        } else if ((warrior.zone === this.station.zone) || (this.station.zone.alertLevel >= ALERT_RED)) {
          this.details = getDetails(this, "dodge");
          this.goDodge();
        } else {
          this.details = getDetails(this, "stalk");
          this.goRouteTo(this.station);

          isInTransit = true;
        }

        this.isBusy = true;
      } else if (this.shouldMarch()) {
        this.details = getDetails(this, "march");
        this.goMarch();
        this.isBusy = true;
      } else if (warrior.zone === this.station.zone) {
        this.details = getDetails(this, "station");

        if (this.battle.mode === Battle.MODE_STAND) {
          // There are no enemies nearby. Move to the station ready to leave room for buildings
          Order.move(warrior, this.station, Order.MOVE_NEAR_BY);
        } else {
          Order.hold(warrior, this.station);
        }

        this.isBusy = false;
      } else {
        this.details = getDetails(this, "route");
        this.goRouteTo(this.station);

        isInTransit = true;
        this.isBusy = false;
      }
    } else {
      this.details = getDetails(this, "deploy");
      this.goRouteTo(this.station);

      isInTransit = true;
      this.isBusy = false;
    }

    if (!isInTransit) {
      this.transit = null;
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
    const warrior = this.assignee;
    const target = this.target;

    if (!warrior || !target) return false;
    if (target.lastSeen < warrior.lastSeen) return false;
    if (warrior.weapon.cooldown) return false;
    if (this.isKitingSuppressed && (target.zone !== this.station.zone)) return false;
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
      if (isClose(warrior.body, target.body, CHECKIN_DISTANCE)) {
        // Cannot hit this target. Either it's hidden and we don't have detection, or it's gone
        target.sector.untrackUnit(target);
      } else {
        // Move closer to see the target so that warrior can attack it
        Order.move(warrior, target.body);
      }
    } else if (shouldRegenerateShields(warrior, this.battle, this.station)) {
      // Regenerate shields
      Order.move(warrior, this.station, Order.MOVE_CLOSE_TO);
      this.attackMoveForward = false;
    } else if (shouldMoveToCoolDown(warrior, this.station, target)) {
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

  goRouteTo(rally) {
    const warrior = this.assignee;
    if (!warrior || !rally) return;

    // When the warrior can shoot an enemy, then shoot
    if (!warrior.weapon.cooldown) {
      let target;

      for (const sector of [warrior.sector, ...warrior.sector.neighbors]) {
        for (const enemy of sector.enemies) {
          if (!isInFireRange(warrior, enemy)) continue;

          if (!target || (enemy.armor.total < target.armor.total)) {
            target = enemy;
          }
        }
      }

      if (target) {
        return Order.attack(warrior, target);
      }
    }

    // When there is no route to follow, move directly to the rally point
    const rallyRoute = rally.zone?.route;
    if (!rallyRoute) return Order.move(warrior, rally);

    // When the warrior is already on the route to the rally point, move to the next transit zone
    if (this.transit) {
      const index = rallyRoute.indexOf(this.transit);
      const nextTransit = rallyRoute[index - 1];

      if (index >= 0) {
        if (!isClose(warrior.body, this.transit, CHECKIN_DISTANCE)) {
          // Warrior has not reached the space of the transit zone
          if (nextTransit) {
            const distanceThisTransit = calculateSquareDistance(warrior.zone, this.transit);
            const distanceNextTransit = calculateSquareDistance(warrior.zone, nextTransit);

            if (distanceNextTransit < distanceThisTransit) {
              // But is closer to the next transit zone. Transit through it
              this.transit = nextTransit;
            }
          }

          // Move closer to the center of the transit zone
          return Order.move(warrior, this.transit);
        } else if (nextTransit) {
          // Warrior has reached this transit zone. Set next transit zone
          this.transit = nextTransit;

          return Order.move(warrior, this.transit);
        } else {
          // Warrior has reached the last transit zone. Move to the rally point
          return Order.move(warrior, rally);
        }
      }
    }

    // When the warrior is in a zone on the route to the rally point, transit through it
    if (rallyRoute.indexOf(warrior.zone) >= 0) {
      this.transit = warrior.zone;

      return Order.move(warrior, warrior.zone);
    }

    // When the warrior route crosses route to the rally point, transit through the crossing
    const warriorRoute = warrior.zone?.route;
    if (warriorRoute) {
      for (const zone of warriorRoute) {
        if (rallyRoute.indexOf(zone) >= 0) {
          this.transit = zone;

          return Order.move(warrior, zone);
        }
      }
    }

    // Otherwise, move directly to the rally point
    Order.move(warrior, rally);
  }

  goDodge() {
    const warrior = this.assignee;

    let closestThreat;
    let closestThreatDistance;

    for (const sector of this.battle.sectors) {
      for (const threat of sector.threats) {
        if (!isInFireRange(threat, warrior, STALKING_BUFFER_RANGE)) continue;

        const distance = calculateSquareDistance(warrior.body, threat.body);

        if (!closestThreat || (distance < closestThreatDistance)) {
          closestThreat = threat;
          closestThreatDistance = distance;
        }
      }
    }

    if (closestThreat) {
      let dx = warrior.body.x - closestThreat.body.x;
      let dy = warrior.body.y - closestThreat.body.y;
      const adxy = Math.abs(dx) + Math.abs(dy) + 0.1;

      if (adxy < 2) {
        const factor = Math.min(2 / adxy, 10);
        dx *= factor;
        dy *= factor;
      }

      Order.move(warrior, {
        x: warrior.body.x + dx,
        y: warrior.body.y + dy,
      });
    } else {
      Order.move(warrior, this.station);
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

      Order.rest(warrior);
    } else {
      // Make sure the spread movement is counted as marching
      marching.isMarching = true;

      Order.move(warrior, this.target || this.battle.front.rally);
    }
  }

  close(outcome) {
    Order.rest(this.assignee);

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

function shouldMoveToCoolDown(warrior, station, target) {
  // If the warrior is holding position behind a wall and the target is outside the wall, then hold the position
  if (station.isHoldStation && target.zone && (target.zone !== warrior.zone)) return false;

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
  if (!warrior || !target) return false;

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
