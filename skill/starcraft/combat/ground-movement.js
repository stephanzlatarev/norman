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

  // When there is no route to follow, move directly to the rally point
  const rallyRoute = rally.zone?.route;
  if (!rallyRoute) return Order.move(warrior, rally);

  // When the warrior is already on the route to the rally point, move to the next transit zone
  if (warrior.transit) {
    const index = rallyRoute.indexOf(warrior.transit);
    const nextTransit = rallyRoute[index - 1];

    if (index >= 0) {
      if (!isClose(warrior.body, warrior.transit, CHECKIN_DISTANCE)) {
        // Warrior has not reached the space of the transit zone
        if (nextTransit) {
          const distanceThisTransit = calculateSquareDistance(warrior.zone, warrior.transit);
          const distanceNextTransit = calculateSquareDistance(warrior.zone, nextTransit);

          if (distanceNextTransit < distanceThisTransit) {
            // But is closer to the next transit zone. Transit through it
            warrior.transit = nextTransit;
          }
        }

        // Move closer to the center of the transit zone
        return moveToZone(warrior, warrior.transit);
      } else if (nextTransit) {
        // Warrior has reached this transit zone. Set next transit zone
        warrior.transit = nextTransit;

        return moveToZone(warrior, warrior.transit);
      } else {
        // Warrior has reached the last transit zone. Move to the rally point
        return Order.move(warrior, rally);
      }
    }
  }

  // When the warrior is in a zone on the route to the rally point, transit through it
  if (rallyRoute.indexOf(warrior.zone) >= 0) {
    warrior.transit = warrior.zone;

    return Order.move(warrior, warrior.zone);
  }

  // When the warrior route crosses route to the rally point, transit through the crossing
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

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
