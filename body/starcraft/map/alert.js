import Zone from "./zone.js";

export const ALERT_BLUE = 1;    // The zone is secured with warriors and there are no enemy threats in it
export const ALERT_GREEN = 2;   // The zone is owned with structures and there are no enemy threats in it
export const ALERT_WHITE = 3;   // The zone is in the back range of enemy threats and there are no indications of enemy threats in the zone
export const ALERT_YELLOW = 4;  // The zone is in the front range of enemy threats and can station there
export const ALERT_ORANGE = 5;  // The zone is in the fire range of enemy threats
export const ALERT_PINK = 6;    // There are no indications of enemy threats in the zone but there is also no secure path to own zones
export const ALERT_RED = 7;     // There are enemy threats in the zone

export const hotspots = new Set();

export function syncAlerts() {
  const zones = Zone.list();
  const bases = new Set();
  const army = new Set();

  for (const zone of zones) {
    if (zone.threats.size) {
      zone.alertLevel = ALERT_RED;
    } else if (zone.warriors.size) {
      zone.alertLevel = ALERT_BLUE;
      army.add(zone);
    } else if (zone.buildings.size) {
      zone.alertLevel = ALERT_GREEN;
    } else {
      zone.alertLevel = ALERT_WHITE;
    }

    if (zone.tier && (zone.tier.level === 1) && zone.cells.size) {
      bases.add(zone);
    }
  }

  identifyHotspots(zones);
  increaseAlertLevelForHotspotFronts();
  increaseAlertLevelForZonesWithoutSecureAccess(zones, bases, army);
}

function increaseAlertLevelForZonesWithoutSecureAccess(zones, bases, army) {
  const presence = [...bases, ...army];
  const traversed = new Set(presence);
  const accessible = new Set(presence);

  let wave = new Set(presence);

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

  for (const zone of zones) {
    if (!zone.cells.size) continue;
    if ((zone.alertLevel <= ALERT_YELLOW) && !accessible.has(zone)) zone.alertLevel = ALERT_PINK;
  }
}

class Hotspot {

  constructor(center) {
    this.center = center;
    this.tierLevel = center.tier.level;
    this.zones = new Set();
    this.fire = new Set();
    this.front = new Set();
    this.back = new Set();

    if (center.tier.level === 1) {
      this.fire.add(center);
      this.front.add(center);
      this.zones.add(center);

      for (const zone of center.neighbors) {
        if (zone.cells.size && !this.zones.has(zone)) {
          this.back.add(zone);
          this.zones.add(zone);
        }
      }
      if (!this.back.size) {
        this.back.add(center);
      }
    } else if (center.tier.level === 2) {
      const base = [...center.neighbors].find(zone => (zone.cells.size && (zone.tier.level === 1)));

      this.fire.add(center);
      this.front.add(base);
      this.back.add(base);

      this.zones.add(center);
      for (const zone of center.neighbors) {
        if (zone.cells.size) {
          this.zones.add(zone);
        }
      }
      this.zones.add(base);
      for (const zone of base.neighbors) {
        if (zone.cells.size) {
          this.zones.add(zone);
        }
      }
    } else if (doesZoneThreatenNeighbors(center)) {
      for (const zone of center.range.fire) {
        this.fire.add(zone);
        this.zones.add(zone);
      }

      for (const zone of center.range.front) {
        this.front.add(zone);
        this.zones.add(zone);
      }

      for (const zone of center.range.back) {
        this.back.add(zone);
        this.zones.add(zone);
      }
    } else {
      this.fire.add(center);
      this.front.add(center);
      this.zones.add(center);

      for (const zone of center.neighbors) {
        if (zone.cells.size && !this.zones.has(zone)) {
          this.back.add(zone);
          this.zones.add(zone);
        }
      }
    }
  }

  isOverlappingWith(hotspot) {
    for (const zone of hotspot.zones) {
      if (this.zones.has(zone)) return true;
    }
  }

  addHotspot(hotspot) {
    for (const zone of hotspot.fire) {
      this.zones.add(zone);
      this.fire.add(zone);
      this.front.delete(zone);
      this.back.delete(zone);
    }

    for (const zone of hotspot.front) {
      this.zones.add(zone);
      if (!this.fire.has(zone)) this.front.add(zone);
      this.back.delete(zone);
    }

    for (const zone of hotspot.back) {
      this.zones.add(zone);
      if (!this.fire.has(zone) && !this.front.has(zone)) this.back.add(zone);
    }
  }

}

function identifyHotspots(zones) {
  hotspots.clear();

  for (const zone of zones) {
    if (zone.alertLevel === ALERT_RED) {
      hotspots.add(new Hotspot(zone));
    }
  }

  for (const one of hotspots) {
    for (const another of hotspots) {
      if (one === another) continue;
      if (one.tierLevel === 1) continue;               // Don't merge tier 1 hotspots
      if (one.tierLevel > another.tierLevel) continue; // Only higher tier hotspots can merge into lower tier hotspots 

      if (one.isOverlappingWith(another)) {
        one.addHotspot(another);
        hotspots.delete(another);
      }
    }
  }
}

// TODO: Add spell casters and later air-hitters
function doesZoneThreatenNeighbors(zone) {
  for (const threat of zone.threats) {
    if (threat.type.isWorker) continue;

    if (threat.type.damageGround && (threat.type.rangeGround > 4)) {
      return true;
    }
  }

  return false;
}

function increaseAlertLevelForHotspotFronts() {
  for (const hotspot of hotspots) {
    for (const zone of hotspot.front) if (zone.alertLevel < ALERT_YELLOW) zone.alertLevel = ALERT_YELLOW;
    for (const zone of hotspot.fire) if (zone.alertLevel < ALERT_ORANGE) zone.alertLevel = ALERT_ORANGE;
  }
}
