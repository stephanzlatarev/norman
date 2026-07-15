import { Order, Resources } from "./imports.js";

const CHECKIN_DISTANCE = 5;
const TRAFFIC_RESERVATION_LOOPS = 10;

export function routeTo(warrior, rally) {
  if (!warrior || !rally) return;

  // When the warrior can shoot an enemy, then shoot
  if (!warrior.weapon.cooldown) {
    let target;

    for (const sector of [warrior.sector, ...warrior.sector.neighbors]) {
      for (const enemy of sector.enemies) {
        if (!warrior.isTargetInFireRange(enemy)) continue;

        if (!target || (enemy.armor.total < target.armor.total)) {
          target = enemy;
        }
      }
    }

    if (target) {
      return Order.attack(warrior, target);
    }
  }

  // When the warrior is already in the rally zone, move directly to the rally point
  if (warrior.zone === rally.zone) return Order.move(warrior, rally);

  // When there is no route to follow, move directly to the rally point
  const rallyRoute = rally.zone?.route;
  if (!rallyRoute) return Order.move(warrior, rally);

  const warriorZoneIndex = rallyRoute.indexOf(warrior.zone);
  const transitZoneIndex = warrior.transit ? rallyRoute.indexOf(warrior.transit) : -1;

  // When warrior is on the route and has already checked into the route, move to the transit zone
  if (warriorZoneIndex >= 0 && transitZoneIndex >= 0) {
    if (warrior.transit === warrior.zone) {
      if (isClose(warrior.body, warrior.transit, CHECKIN_DISTANCE)) {
        // Warrior reached the transit space. Advance to the next zone on the route.
        const nextZone = rallyRoute[transitZoneIndex - 1];

        if (nextZone) {
          warrior.transit = nextZone;
          return moveToZone(warrior, nextZone);
        } else {
          return Order.move(warrior, rally);
        }
      } else {
        // Still moving to the center of the transit zone
        return Order.move(warrior, warrior.transit);
      }
    }

    return moveToZone(warrior, warrior.transit);
  }

  // When transit is not on the route, check into the zone where the warrior's path crosses the rally route
  if (warriorZoneIndex >= 0) {
    warrior.transit = warrior.zone;
    return Order.move(warrior, warrior.zone);
  }

  const warriorRoute = warrior.zone?.route;
  if (warriorRoute) {
    for (const zone of warriorRoute) {
      if (rallyRoute.indexOf(zone) >= 0) {
        warrior.transit = zone;
        return moveToZone(warrior, zone);
      }
    }
  }

  // Otherwise, move directly to the rally point
  Order.move(warrior, rally);
}

function moveToZone(warrior, zone) {
  if (warrior.zone !== zone) {
    const corridor = warrior.zone.exits.get(zone);

    if (corridor?.isChoke) {
      const movingTowardsHome = (zone.perimeterLevel < warrior.zone.perimeterLevel);

      if (movingTowardsHome) {
        corridor.traffic = Resources.loop + TRAFFIC_RESERVATION_LOOPS;
      } else if (corridor.traffic > Resources.loop) {
        // Choke is reserved for traffic towards home. Wait in current zone.
        return Order.move(warrior, warrior.zone);
      }
    }
  }

  Order.move(warrior, zone);
}

function isClose(a, b, distance) {
  return (Math.abs(a.x - b.x) <= distance) && (Math.abs(a.y - b.y) <= distance);
}
