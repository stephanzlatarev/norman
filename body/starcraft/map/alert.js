import Zone from "./zone.js";

export const ALERT_BLUE = 1;
export const ALERT_GREEN = 2;
export const ALERT_WHITE = 3;
export const ALERT_YELLOW = 4;
export const ALERT_ORANGE = 5;
export const ALERT_RED = 6;

export function syncAlerts() {
  const zones = Zone.list();

  let support = new Set();
  let escape = new Set();

  for (const zone of zones) {
    if (zone.threats.size && zone.warriors.size) {
      zone.alertLevel = ALERT_YELLOW;
    } else if (zone.threats.size) {
      zone.alertLevel = ALERT_RED;
    } else if (zone.warriors.size) {
      zone.alertLevel = ALERT_BLUE;

      if (zone.isCorridor) {
        for (const neighbor of zone.zones) support.add(neighbor);
      } else {
        support.add(zone);
      }
    } else if (zone.buildings.size) {
      zone.alertLevel = ALERT_GREEN;
    } else {
      zone.alertLevel = ALERT_WHITE;
    }

    if (zone.tier && (zone.tier.level === 1)) {
      escape.add(zone);
    }
  }

  // Lower alert level to Yellow for zones that can be reached by our army
  let done = new Set();
  while (support.size) {
    const next = new Set();

    for (const zone of support) {
      for (const corridor of zone.corridors) {
        for (const neighbor of corridor.zones) {
          if ((neighbor === zone) || done.has(neighbor)) continue;

          if (neighbor.alertLevel === ALERT_RED) {
            neighbor.alertLevel = ALERT_YELLOW;
          } else if (neighbor.alertLevel <= ALERT_WHITE) {
            next.add(neighbor);
          }
        }
      }

      done.add(zone);
    }

    support = next;
  }

  // Increase alert level to Orange for zones that have no escape path to our bases
  done = new Set();
  while (escape.size) {
    const next = new Set();

    for (const zone of escape) {
      for (const corridor of zone.corridors) {
        for (const neighbor of corridor.zones) {
          if ((neighbor === zone) || done.has(neighbor)) continue;

          if (neighbor.alertLevel <= ALERT_WHITE) {
            next.add(neighbor);
          }
        }
      }

      done.add(zone);
    }

    escape = next;
  }
  for (const zone of zones) {
    if ((zone.alertLevel <= ALERT_WHITE) && !done.has(zone)) zone.alertLevel = ALERT_ORANGE;
  }
}
