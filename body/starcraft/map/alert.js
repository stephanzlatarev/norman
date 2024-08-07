import Zone from "./zone.js";

export const ALERT_BLUE = 1;
export const ALERT_GREEN = 2;
export const ALERT_WHITE = 3;
export const ALERT_YELLOW = 4;
export const ALERT_RED = 5;

export function syncAlerts() {
  const zones = Zone.list();
  const done = new Set();
  let wave = new Set();

  for (const zone of zones) {
    if (zone.threats.size && zone.warriors.size) {
      zone.alertLevel = ALERT_YELLOW;
    } else if (zone.threats.size) {
      zone.alertLevel = ALERT_RED;
    } else if (zone.warriors.size) {
      zone.alertLevel = ALERT_BLUE;
      wave.add(zone);
    } else if (zone.buildings.size) {
      zone.alertLevel = ALERT_GREEN;
    } else {
      zone.alertLevel = ALERT_WHITE;
    }
  }

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
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

    wave = next;
  }
}
