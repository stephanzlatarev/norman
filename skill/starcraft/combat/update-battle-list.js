import { Depot, Enemy, Memory, TotalCount, Zone } from "./imports.js";
import { ALERT_RED, ALERT_YELLOW, PERIMETER_GREEN, PERIMETER_WHITE } from "./imports.js";
import Battle from "./battle.js";

const MAX_BATTLE_PRIORITY = 90;

const BATTLE_LIST = [
  null,
  listSiegeDefenseBattles,
  listNormalDefenseBattles,
  listExpandDefenseBattles,
  listProbingAttackBattles,
  listNormalOffenseBattles,
  listFullOffenseBattles,
];

export default function() {
  const battles = new Set();
  const enlist = BATTLE_LIST[Math.floor(Memory.DeploymentOutreach)];

  if (enlist) {
    enlist(battles);
  }

  return battles;
}

// Defend the largest defendable perimeter with all warriors behind walls.
function listSiegeDefenseBattles(battles) {
  // TODO: Currently only defends home base. Make it identify the largest defendable perimeter.
  battles.add(getBattle(Battle.list(), MAX_BATTLE_PRIORITY, Depot.home));
}

// Station warriors in economy perimeter
function listNormalDefenseBattles(battles) {
  const outpost = findOutpostBase();
  const outpostPerimeterLevel = outpost?.perimeterLevel || PERIMETER_GREEN;

  listBattlesInRedZones(battles, outpostPerimeterLevel);

  if (!battles.size) {
    battles.add(getBattle(Battle.list(), MAX_BATTLE_PRIORITY, findFrontBaseZone()));
  }
}

// Secure the next expansion location. Battle our way to it if necessary.
function listExpandDefenseBattles(battles) {
  listBattlesInRedZones(battles, PERIMETER_GREEN);

  if (!battles.size) {
    const expansion = getBuildingExpansionZone() || getNextExpansionZone();

    if (expansion) {
      // TODO: Select rally zone within our perimeter
      battles.add(getBattle(Battle.list(), MAX_BATTLE_PRIORITY, expansion));
    }
  }
}

// Test enemy lines for weaknesses and keep main army ready to return to defense
function listProbingAttackBattles(battles) {
  // TODO: Replacing pure defense with probing battles with limited forces.
  // Keep the main army well positioned to either support a winning attack or go back to defend
  listExpandDefenseBattles(battles);
}

// Create multi-pronged attacks on weakest enemy zones
function listNormalOffenseBattles(battles) {
  listOffenseBattles(battles);
}

// Create aggressive attacks
function listFullOffenseBattles(battles) {
  listOffenseBattles(battles);
}

function listOffenseBattles(battles) {
  listBattlesInRedZones(battles, Infinity);

  if (!battles.size && Enemy.base) {
    // TODO: Select rally zone to the enemy base
    battles.add(getBattle(Battle.list(), MAX_BATTLE_PRIORITY, Enemy.base));
  }
}

function listBattlesInRedZones(battles, perimeterLevelLimit) {
  const hotspots = [];

  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    if (!zone.perimeterLevel) continue;
    if (zone.perimeterLevel > perimeterLevelLimit) continue;

    if (!zone.alertLevel) continue;
    if (zone.alertLevel < ALERT_RED) continue;

    const rally = findRallyZone(zone);
    const isZoneOutsidePerimeter = !zone.perimeterLevel || (zone.perimeterLevel >= PERIMETER_WHITE);
    const isRallyHotspot = !rally || !rally.alertLevel || (rally.alertLevel >= ALERT_RED);

    // When outside our perimeter, the rally zone must not be a hotspot itself
    const isRallyAcceptable = !isZoneOutsidePerimeter || !isRallyHotspot;

    if (isRallyAcceptable) hotspots.push({ zone, rally, skip: false, processed: false, taken: false });
  }

  hotspots.sort((a, b) => (a.zone.perimeterLevel - b.zone.perimeterLevel));

  const candidates = new Set(Battle.list());
  let priority = MAX_BATTLE_PRIORITY - 1;

  for (const one of hotspots) one.priority = priority--;

  for (const one of hotspots) {
    if (one.skip) continue;
    one.processed = true;

    const battle = findBattle(candidates, one.zone);

    if (battle) {
      battles.add(battle.move(one.priority, one.zone, one.rally));
      candidates.delete(battle);
      one.taken = true;

      // Remove other battles in adjacent sectors
      for (const other of candidates) {
        if (battles.has(other)) continue;

        if (areZonesTooClose(one.zone, other.front)) {
          candidates.delete(other);
        }
      }

      // Remove other hotspots in adjacent sectors
      for (const other of hotspots) {
        if (other.processed) continue;

        if (areZonesTooClose(one.zone, other.zone)) {
          other.skip = true;
        }
      }
    }
  }

  for (const one of hotspots) {
    if (one.skip) continue;
    if (one.taken) continue;

    battles.add(getBattle(candidates, one.priority, one.zone, one.rally));
  }
}

function areZonesTooClose(a, b) {
  // Depots are never too close to be separate fronts
  if (a.isDepot && b.isDepot) return false;

  // Zones are too close to be separate front if they are in adjacent sectors.
  return a.cell.sector.neighbors.has(b.cell.sector);
}

function findRallyZone(zone) {
  let hasShieldBattery = false;

  for (const building of zone.buildings) {
    if (building.isActive && building.energy && (building.type.name === "ShieldBattery")) {
      hasShieldBattery = true;
      break;
    }
  }

  if (hasShieldBattery) {
    return zone;
  }

  // Rally is on route to home base
  if (zone.route) {
    for (let i = 1; i < zone.route.length; i++) {
      const one = zone.route[i];

      if (one.isDepot || one.isHall) {
        return one;
      }
    }
  }

  return zone;
}

function findOutpostBase() {
  let outpost;

  for (const zone of Depot.list()) {
    if (zone.depot) {
      outpost = zone;
    }
  }

  return outpost;
}

// Find the single outer-most depot zone to focus my defense on
function findFrontBaseZone() {
  let frontThreatened;
  let frontSecure;

  for (const zone of Depot.list()) {
    if (!zone.depot) continue;

    if (zone.alertLevel >= ALERT_YELLOW) {
      frontThreatened = zone;
    } else {
      frontSecure = zone;
    }
  }

  return frontThreatened || frontSecure || Depot.home;
}

function getBuildingExpansionZone() {
  for (const depot of Depot.list()) {
    if (depot.depot && !depot.depot.isActive) {
      return depot;
    }
  }
}

function getNextExpansionZone() {
  const pinx = Memory.PinNextExpansionX;
  const piny = Memory.PinNextExpansionY;

  if (pinx && piny) {
    for (const depot of Depot.list()) {
      if ((depot.x === pinx) && (depot.y === piny)) {
        return depot;
      }
    }
  }
}

function findBattle(list, front) {
  for (const battle of list) {
    if (battle.front === front) return battle;
  }
}

function getBattle(list, priority, front, rally) {
  rally = rally || findRallyZone(front);

  for (const battle of list) {
    if (battle.front === front) return battle.move(priority, front, rally);
  }

  for (const battle of list) {
    if (battle.front.neighbors.has(front)) return battle.move(priority, front, rally);
  }

  for (const battle of list) {
    if (battle.rally === front) return battle.move(priority, front, rally);
  }

  return new Battle(priority, front, rally);
}
