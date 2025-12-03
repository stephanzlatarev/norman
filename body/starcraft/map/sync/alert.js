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

  // Set alert levels for zones according to units present
  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    if (zone.threats().size) {
      zone.alertLevel = ALERT_RED;
    } else if (zone.warriors.size) {
      zone.alertLevel = ALERT_BLUE;
    } else if (zone.buildings.size) {
      zone.alertLevel = ALERT_GREEN;
    } else {
      zone.alertLevel = ALERT_WHITE;
    }
  }

  // Increase alert level for zones based on neighboring sectors
  for (const zone of Zone.list()) {
    if (zone.alertLevel >= ALERT_YELLOW) continue;

    for (const sector of zone.sectors) {
      if (sector.alertLevel >= ALERT_YELLOW) {
        zone.alertLevel = ALERT_YELLOW;
        break;
      }
    }
  }
}
