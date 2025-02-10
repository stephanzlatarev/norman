import Zone from "./zone.js";

export const ALERT_BLUE = 1;    // The zone is secured with warriors and there are no enemy threats in range
export const ALERT_GREEN = 2;   // The zone is owned with structures and there are no enemy threats in range
export const ALERT_WHITE = 3;   // There are no indications of enemy threats in range
export const ALERT_YELLOW = 4;  // The zone is just outside fire range of enemy threats. Can station warriors in the zone
export const ALERT_ORANGE = 5;  // The zone is in fire range of enemy threats
export const ALERT_PINK = 6;    // There are no indications of enemy threats in the zone but there is also no secure path to own zones
export const ALERT_RED = 7;     // There are enemy threats in the zone

export function syncAlerts() {
  const zones = Zone.list();
  const accessible = new Set();
  const enemy = new Set();

  for (const zone of zones) {
    if (zone.threats.size) {
      zone.alertLevel = ALERT_RED;
      enemy.add(zone);
    } else if (zone.warriors.size) {
      zone.alertLevel = ALERT_BLUE;
    } else if (zone.buildings.size) {
      zone.alertLevel = ALERT_GREEN;
    } else {
      zone.alertLevel = ALERT_WHITE;
    }

    if (zone.warriors.size || (zone.tier && (zone.tier.level === 1) && zone.cells.size)) {
      accessible.add(zone);
    }
  }

  increaseAlertLevelForFireRange(enemy);

  traverseAccessibleZones(accessible);
  increaseAlertLevelForZonesWithoutSecureAccess(zones, accessible);
}

function increaseAlertLevelForFireRange(zones) {
  for (const zone of zones) {
    if (hasLongRangeThreats(zone)) {
      for (const one of zone.range.front) if (one.alertLevel < ALERT_YELLOW) one.alertLevel = ALERT_YELLOW;
      for (const one of zone.range.fire) if (one.alertLevel < ALERT_ORANGE) one.alertLevel = ALERT_ORANGE;
    } else {
      for (const one of zone.neighbors) if (one.alertLevel < ALERT_YELLOW) one.alertLevel = ALERT_YELLOW;
    }
  }
}

function increaseAlertLevelForZonesWithoutSecureAccess(zones, accessible) {
  for (const zone of zones) {
    if (zone.cells.size && (zone.alertLevel <= ALERT_YELLOW) && !accessible.has(zone)) zone.alertLevel = ALERT_PINK;
  }
}

function hasLongRangeThreats(zone) {
  for (const threat of zone.threats) {
    if (threat.type.rangeGround > 3) {
      return true;
    }
  }
}

function traverseAccessibleZones(accessible) {
  const traversed = new Set(accessible);

  let wave = new Set(accessible);

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
      for (const neighbor of zone.neighbors) {
        if (!neighbor.cells.size) continue;
        if (traversed.has(neighbor)) continue;

        if (neighbor.alertLevel <= ALERT_YELLOW) {
          accessible.add(neighbor);
        }

        if (neighbor.alertLevel <= ALERT_WHITE) {
          next.add(neighbor);
        }

        traversed.add(neighbor);
      }
    }

    wave = next;
  }
}
