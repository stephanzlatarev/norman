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
  listBattlesInRedZones(battles, PERIMETER_GREEN);

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
  listOffenseBattles(battles);
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

    if (rally) hotspots.push({ zone, rally });
  }

  hotspots.sort((a, b) => (a.zone.perimeterLevel - b.zone.perimeterLevel));

  const taken = new Set();
  const candidates = new Set(Battle.list());
  let priority = MAX_BATTLE_PRIORITY - 1;

  for (const one of hotspots) one.priority = priority--;

  for (const one of hotspots) {
    const battle = findBattle(candidates, one.zone);

    if (battle) {
      battles.add(battle.move(one.priority, one.zone, one.rally));
      candidates.delete(battle);
      taken.add(one);
    }
  }

  for (const one of hotspots) {
    if (!taken.has(one)) {
      battles.add(getBattle(candidates, one.priority, one.zone, one.rally));
    }
  }
}

function findRallyZone(zone) {
  if (zone.perimeterLevel && (zone.perimeterLevel < PERIMETER_GREEN)) {
    // The zone is inside our defendable perimeter
    return zone;
  }

  let rally = zone;

  // The rally zone is the exit closest to our perimeter
  for (const [neighbor, corridor] of zone.exits) {
    if (!corridor.via.isPassage) continue;
    if (!neighbor.perimeterLevel) continue;

    if (neighbor.perimeterLevel < rally.perimeterLevel) {
      rally = neighbor;
    }
  }

  if (zone.perimeterLevel && (zone.perimeterLevel >= PERIMETER_WHITE)) {
    // When outside our perimeter, the rally zone must not be a hotspot itself
    if (!rally.alertLevel || (rally.alertLevel >= ALERT_RED)) return;
  }

  return rally;
}

function findFrontBaseZone() {
  if ((TotalCount.Nexus === 1) || (Depot.home.alertLevel >= ALERT_RED)) {
    return Depot.home;
  }

  let frontThreatened;
  let frontSecure;

  for (const zone of Depot.list()) {
    if (!zone.depot) continue;
    if (zone.alertLevel >= ALERT_RED) return zone;
    if (zone.alertLevel >= ALERT_YELLOW) frontThreatened = zone;

    frontSecure = zone;
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
  for (const battle of list) {
    if (battle.front === front) return battle.move(priority, front, rally);
  }

  for (const battle of list) {
    if (battle.front.neighbors.has(front)) return battle.move(priority, front, rally);
  }

  for (const battle of list) {
    if (battle.rally === front) return battle.move(priority, front, rally);
  }

  return new Battle(90, front, rally);
}
