import { Depot, Memory, Zone } from "./imports.js";
import { ALERT_RED, PERIMETER_WHITE } from "./imports.js";

const IS_STRONG_ENEMY = {
  Battlecruiser: true,
  Bunker: true,
  Immortal: true,
  ShieldBattery: true,
  SiegeTank: true,
  SiegeTankSieged: true,
};

const IS_TRENCH_ENEMY = {
  Bunker: true,
  PhotonCannon: true,
  ShieldBattery: true,
};

export default function() {
  const hotspots = new Map();

  if (Memory.DeploymentOutreach < Memory.DeploymentOutreachNormalDefense) {
    // We are in home base (Starter / Siege Defense)
    hotspots.set(Depot.home, new Hotspot(Depot.home));
  } else if (Memory.DeploymentOutreach < Memory.DeploymentOutreachProbingAttack) {
    // We are in defense mode (Normal Defense / Expand Defense)
    populateHotspots(hotspots);
    limitHotspots(hotspots, PERIMETER_WHITE);
    if (!hotspots.size) addPerimeterHotspot(hotspots);
  } else {
    // We are in offense mode (Probing Attack / Normal Offense / Full Offense)
    populateHotspots(hotspots);
    if (!findNormalHotspot(hotspots)) hotspots.set(Depot.enemy, new Hotspot(Depot.enemy));
  }

  return hotspots;
}

function findNormalHotspot(hotspots) {
  for (const hotspot of hotspots.values()) {
    if (hotspot.isNormalHotspot) return hotspot;
  }
}

class Hotspot {

  constructor(zone) {
    this.move(zone);
  }

  move(zone) {
    this.zone = zone;

    this.isEnforcedHotspot = isEnforcedHotspot(this);

    if (zone === Depot.home) {
      this.rally = Depot.home;
    } else if (this.isEnforcedHotspot) {
      this.rally = zone;
    } else {
      this.rally = zone.backward;
      while (this.rally && !this.rally.isDepot && !this.rally.isHall && this.rally.backward) this.rally = this.rally.backward;
      if (!this.rally) this.rally = zone;
    }

    this.level = Math.round(this.rally.perimeterLevel * 10000 + this.zone.perimeterLevel * 100);

    this.isAirHotspot = isAirHotspot(this);
    this.isEmptyHotspot = isEmptyHotspot(this);
    this.isSmallHotspot = isSmallHotspot(this);

    this.isTrenchHotspot = isTrenchHotspot(this);
    this.isCleanupHotspot = !this.isTrenchHotspot && isCleanupHotspot(this);
    this.isInterceptHotspot = this.isSmallHotspot && !this.isTrenchHotspot && !this.isCleanupHotspot;
    this.isMissionHotspot = this.isCleanupHotspot || this.isInterceptHotspot;

    if ((zone === Depot.enemy) && !this.isEmptyHotspot) {
      this.isNormalHotspot = true;
      this.isMissionHotspot = false;
    } else {
      this.isNormalHotspot = !this.isMissionHotspot && !this.isEmptyHotspot;
    }
  }

  copyFlags(hotspot) {
    this.isEnforcedHotspot = hotspot.isEnforcedHotspot;
    this.isAirHotspot = hotspot.isAirHotspot;
    this.isEmptyHotspot = hotspot.isEmptyHotspot;
    this.isSmallHotspot = hotspot.isSmallHotspot;
    this.isTrenchHotspot = hotspot.isTrenchHotspot;
    this.isCleanupHotspot = hotspot.isCleanupHotspot;
    this.isInterceptHotspot = hotspot.isInterceptHotspot;
    this.isMissionHotspot = hotspot.isMissionHotspot;
    this.isNormalHotspot = hotspot.isNormalHotspot;
  }

  map(battle) {
    battle.move(this.zone, this.rally);

    battle.level = this.level;

    if (this.isCleanupHotspot || this.isInterceptHotspot) {
      battle.sectors = new Set([...this.zone.sectors, ...this.rally.sectors]);
    } else {
      battle.sectors = new Set([...this.zone.horizon, ...this.rally.sectors]);
    }

    battle.isAirBattle = this.isAirHotspot;
    battle.isEmptyBattle = this.isEmptyHotspot;
    battle.isSmallBattle = this.isSmallHotspot;

    battle.isCleanupBattle = this.isCleanupHotspot;
    battle.isInterceptBattle = this.isInterceptHotspot;
    battle.isMissionBattle = this.isMissionHotspot;
    battle.isNormalBattle = this.isNormalHotspot;
    battle.isTrenchBattle = this.isTrenchHotspot;

    battle.isFocusBattle = this.isFocusHotspot;

    return battle;
  }

  getDetails() {
    const details = [this.zone.name];

    if (this.isNormalHotspot) details.push("n");
    if (this.isMissionHotspot) details.push("m");
    if (this.isTrenchHotspot) details.push("t");
    if (this.isCleanupHotspot) details.push("c");
    if (this.isInterceptHotspot) details.push("i");
    if (this.isSmallHotspot) details.push("s");
    if (this.isAirHotspot) details.push("a");
    if (this.isEmptyHotspot) details.push("e");

    return details.join("");
  }

}

function populateHotspots(hotspots) {
  let wave = new Set([Depot.home]);

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
      if (isHotspot(zone)) {
        const hotspot = new Hotspot(zone);

        hotspots.set(zone, hotspot);

        if (hotspot.isNormalHotspot) continue;
      }

      for (const one of zone.forward) {
        next.add(one);
      }
    }

    wave = next;
  }
}

function isHotspot(zone) {
  if (!zone.isDepot && !zone.isHall) return false;
  if (!zone.alertLevel) return false;

  return (zone.alertLevel >= ALERT_RED);
}

function isEmptyHotspot(hotspot) {
  const zone = hotspot.zone;

  // The hotspot is not considered empty if there are no warriors inside to have visibility
  let hasWarriors = false;
  for (const warrior of zone.warriors) {
    if (isClose(warrior.body, zone.rally, zone.isDepot ? 8 : 5)) {
      hasWarriors = true;
      break;
    }
  }
  if (!hasWarriors) return false;

  // The hotspot is not considered empty if there are enemy units inside
  for (const sector of zone.sectors) {
    for (const one of sector.threats) {
      if (isUnitInHotspot(one, hotspot)) return false;
    }
    for (const one of sector.contacts) {
      if (isUnitInHotspot(one, hotspot)) return false;
    }
  }

  return true;
}

function isAirHotspot(hotspot) {
  let hasAirThreats = false;

  for (const sector of hotspot.zone.sectors) {
    for (const threat of sector.threats) {
      if (!threat.zone) continue;
      if (!isUnitInHotspot(threat, hotspot)) continue;

      if (threat.body.isGround) {
        // There's at least this one ground enemy unit, so the battle is not only in the air
        return false;
      } else {
        hasAirThreats = true;
      }
    }
  }

  return hasAirThreats;
}

function isEnforcedHotspot(hotspot) {
  for (const building of hotspot.zone.buildings) {
    if (building.isActive && building.energy && (building.type.name === "ShieldBattery")) {
      return true;
    }
  }

  return false;
}

function isSmallHotspot(hotspot) {
  let count = 0;

  for (const sector of hotspot.zone.sectors) {
    for (const threat of sector.threats) {
      if (!threat.zone) continue;
      if (!isUnitInHotspot(threat, hotspot)) continue;
      if (threat.type.isWorker) continue;
      if (IS_STRONG_ENEMY[threat.type.name]) return false;
      if (threat.type.damageGround) count++;
      if (count > 2) return false;
    }
  }

  return true;
}

function isCleanupHotspot(hotspot) {
  for (const sector of hotspot.zone.sectors) {
    for (const threat of sector.threats) {
      if (!threat.zone) continue;
      if (!isUnitInHotspot(threat, hotspot)) continue;
      if (threat.type.damageGround) return false;
      if (threat.type.movementSpeed) return false;
    }
  }

  return true;
}

function isTrenchHotspot(hotspot) {
  for (const sector of hotspot.zone.sectors) {
    for (const threat of sector.threats) {
      if (!threat.zone) continue;
      if (!isUnitInHotspot(threat, hotspot)) continue;
      if (IS_TRENCH_ENEMY[threat.type.name]) return true;
    }
  }

  return false;
}

// Move the hotspots outside the perimeter to zones on the same route within the perimeter
function limitHotspots(hotspots, perimeterLevelLimit) {
  for (const [zone, hotspot] of hotspots) {
    if (zone.perimeterLevel > perimeterLevelLimit) {
      const routeZone = findZoneOnRoute(hotspot.zone.route, perimeterLevelLimit);
      const routeHotspot = hotspots.get(routeZone);

      if (hotspot === routeHotspot) {
        // Same hotspot. Do nothing
      } else if (routeHotspot) {
        // Existing hotspot. Delete this
        hotspots.delete(zone);
      } else {
        // No hotpost. Move this
        hotspot.move(routeZone);
        hotspots.delete(zone);
        hotspots.set(routeZone, hotspot);
      }
    }
  }
}

function findZoneOnRoute(route, perimeterLevelLimit) {
  for (const zone of route) {
    if (!zone.isDepot && !zone.isHall) continue;
    if (zone.perimeterLevel <= perimeterLevelLimit) return zone;
  }
}

// Add the outer zone in out perimeter as a hotspot
function addPerimeterHotspot(hotspots) {
  let outerZone = Depot.home;

  for (const zone of Zone.list()) {
    if ((zone.perimeterLevel < PERIMETER_WHITE) && (zone.perimeterLevel > outerZone.perimeterLevel)) {
      outerZone = zone;
    }
  }

  hotspots.set(outerZone, new Hotspot(outerZone));
}

// Unit is in the hotspot if it is in the hotspot zone or in a corridor to it
function isUnitInHotspot(unit, hotspot) {
  if (!unit.zone) return false;
  if (unit.zone === hotspot.zone) return true;

  if (unit.zone.isDepot || unit.zone.isHall) return false;
  if (unit.zone.neighbors.has(hotspot.zone)) return true;
}

function isClose(a, b, span) {
  return (Math.abs(a.x - b.x) <= span) && (Math.abs(a.y - b.y) <= span);
}
