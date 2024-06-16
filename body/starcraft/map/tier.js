import Depot from "./depot.js";
import Zone from "./zone.js";

const ALERT_BLUE = 1;
const ALERT_GREEN = 2;
const ALERT_WHITE = 3;
const ALERT_YELLOW = 4;
const ALERT_RED = 5;

const tiers = [];

class Tier {

  constructor(level, fore, zones, back) {
    this.level = level;
    this.fore = fore;
    this.zones = zones;
    this.back = back;
  }

}

// Update tiers and return them
export function syncTiers() {
  reviewTiers();
  reviewAlerts();
}

function reviewTiers() {
  const depots = [...Depot.list()].filter(depot => !!depot.isActive);

  // Check if active depot changed, assuming only one depot changes state in a single game loop
  if (tiers.length && (depots.length === tiers[0].zones.size)) return tiers;

  if (!depots.length) {
    const zones = Zone.list();

    if (!tiers.length || (zones.length !== tiers[0].zones.size)) {
      const tier = new Tier(1, new Set(), new Set(zones), new Set());

      for (const zone of zones) {
        zone.tier = tier;
      }

      tiers.push(tier);
    }

    return tiers;
  }

  tiers.length = 0;

  let zones = new Set(depots);
  let back = new Set();
  let lowTierZones = new Set();

  while (zones.size) {
    const { fore, nextTierZones } = findCorridorsAndZones(zones, lowTierZones);
    const tier = new Tier(tiers.length + 1, fore, zones, back);

    tiers.push(tier);

    for (const zone of zones) {
      zone.tier = tier;
      lowTierZones.add(zone);
    }

    zones = nextTierZones;
    back = fore;
  }

  for (const zone of Zone.list()) {
    if (zone.isCorridor) {
      const corridor = zone;

      for (const neighbor of corridor.zones) {
        if (!corridor.tier || (neighbor.tier.level < corridor.tier.level)) {
          corridor.tier = neighbor.tier;
        }
      }
    }
  }

  return tiers;
}

function findCorridorsAndZones(zones, lowTierZones) {
  const fore = new Set();
  const nextTierZones = new Set();

  for (const zone of zones) {
    for (const corridor of zone.corridors) {
      for (const neighbor of corridor.zones) {
        if (!zones.has(neighbor) && !lowTierZones.has(neighbor)) {
          fore.add(corridor);
          nextTierZones.add(neighbor);
        }
      }
    }
  }

  return { fore, nextTierZones };
}

function reviewAlerts() {
  const zones = Zone.list();
  const done = new Set();
  let wave = new Set();

  for (const zone of zones) {
    if (zone.threats.size) {
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
      if (done.has(zone)) continue;

      for (const corridor of zone.corridors) {
        for (const neighbor of corridor.zones) {
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

export default tiers;
