import { ALERT_BLUE, ALERT_GREEN, ALERT_WHITE, ALERT_YELLOW, ALERT_RED } from "../alert.js";
import Sector from "../sector.js";
import Zone from "../zone.js";

export function syncAlerts() {
  const enemy = new Set();

  // Set alert levels for sectors according to units present
  for (const sector of Sector.list()) {
    if (sector.threats.size) {
      sector.alertLevel = ALERT_RED;
      enemy.add(sector);
    } else if (sector.warriors.size) {
      sector.alertLevel = ALERT_BLUE;
    } else if (sector.buildings.size) {
      sector.alertLevel = ALERT_GREEN;
    } else {
      sector.alertLevel = ALERT_WHITE;
    }
  }

  // Increase alert level for the neighbors of red sectors
  for (const sector of enemy) {
    for (const neighbor of sector.neighbors) {
      if (neighbor.alertLevel < ALERT_YELLOW) {
        neighbor.alertLevel = ALERT_YELLOW;
      }
    }
  }

  // Set alert levels for zones according to the alert levels of their sectors
  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    let level = ALERT_WHITE;

    for (const sector of zone.sectors) {
      if (sector.alertLevel > ALERT_WHITE) {
        level = Math.max(sector.alertLevel, level);
      } else if (sector.alertLevel < ALERT_WHITE) {
        level = Math.min(sector.alertLevel, level);
      }
    }

    zone.alertLevel = level;
  }
}
