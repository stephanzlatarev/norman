import Depot from "./depot.js";
import Zone from "./zone.js";

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
  const depots = [...Depot.list()].filter(depot => !!depot.isActive);

  // Check if active depot changed, assuming only one depot changes state in a single game loop
  if (tiers.length && (depots.length === tiers[0].zones.size)) return tiers;

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

export default tiers;
