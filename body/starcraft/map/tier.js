import Depot from "./depot.js";
import Zone from "./zone.js";

const tiers = [];

class Tier {

  constructor(level, zones) {
    this.level = level;
    this.zones = zones;
  }

}

export function syncTiers(force) {
  const zones = Zone.list();
  const depots = [...Depot.list()].filter(zone => !!zone.depot);
  const sizeFirstTier = tiers.length ? tiers[0].zones.size : 0;

  // Check if active depot changed, assuming only one depot changes state in a single game loop
  if (!force && (sizeFirstTier === depots.length)) return;

  if (depots.length) {  
    const traversed = new Set();
    let wave = new Set(depots);

    tiers.length = 0;

    while (wave.size) {
      const next = new Set();
      const tier = new Tier(tiers.length + 1, wave);
  
      tiers.push(tier);
  
      for (const zone of wave) {
        traversed.add(zone);
        zone.tier = tier;
      }
  
      for (const zone of wave) {
        for (const neighbor of zone.neighbors) {
          if (!traversed.has(neighbor)) {
            next.add(neighbor);
          }
        }
      }

      wave = next;
    }
  } else if (sizeFirstTier !== zones.length) {
    const tier = new Tier(1, new Set(zones));

    for (const zone of zones) {
      zone.tier = tier;
    }

    tiers.length = 0;
    tiers.push(tier);
  }
}

export function findAntre() {
  for (const tier of tiers) {
    for (const zone of tier.zones) {
      if (zone.isDepot && (zone !== Depot.home)) {
        Depot.antre = zone;

        return Depot.antre;
      }
    }
  }
}

export default tiers;
