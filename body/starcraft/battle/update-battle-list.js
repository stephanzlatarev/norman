import Memory from "../../../code/memory.js";
import Battle from "./battle.js";
import Enemy from "../memo/enemy.js";
import Depot from "../map/depot.js";
import Zone from "../map/zone.js";
import { ALERT_RED, ALERT_YELLOW } from "../map/alert.js";
import { PERIMETER_GREEN } from "../map/perimeter.js";
import { TotalCount } from "../memo/count.js";

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
  battles.add(getBattle(MAX_BATTLE_PRIORITY, Depot.home));
}

// Station warriors in economy perimeter
function listNormalDefenseBattles(battles) {
  listBattlesInRedZones(battles, PERIMETER_GREEN);

  if (!battles.size) {
    battles.add(getBattle(MAX_BATTLE_PRIORITY, findFrontBaseZone()));
  }
}

// Secure the next expansion location. Battle our way to it if necessary.
function listExpandDefenseBattles(battles) {
  listBattlesInRedZones(battles, PERIMETER_GREEN);

  if (!battles.size) {
    const expansion = getBuildingExpansionZone() || getNextExpansionZone();

    if (expansion) {
      // TODO: Select rally zone within our perimeter
      battles.add(getBattle(MAX_BATTLE_PRIORITY, expansion));
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

  if (!battles.size) {
    // TODO: Select rally zone to the enemy base
    battles.add(getBattle(MAX_BATTLE_PRIORITY, Enemy.base));
  }
}

function listBattlesInRedZones(battles, perimeterLevelLimit) {
  const hotspots = [];
  let priority = MAX_BATTLE_PRIORITY - 1;

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

  for (const one of hotspots) {
    battles.add(getBattle(priority--, one.zone, one.rally));
  }
}

function findRallyZone(zone) {
  let rally;

  for (const [neighbor, corridor] of zone.exits) {
    if (!corridor.via.isPassage) continue;
    if (!neighbor.perimeterLevel) continue;

    if (!neighbor.alertLevel) continue;
    if (neighbor.alertLevel >= ALERT_RED) continue;

    if (!rally || (neighbor.perimeterLevel < rally.perimeterLevel)) {
      rally = neighbor;
    }
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

function getBattle(priority, front, rally) {
  for (const battle of Battle.list()) {
    if (battle.front === front) return battle.move(priority, front, rally);
  }

  for (const battle of Battle.list()) {
    if (battle.front.neighbors.has(front)) return battle.move(priority, front, rally);
  }

  for (const battle of Battle.list()) {
    if (battle.rally === front) return battle.move(priority, front, rally);
  }

  return new Battle(90, front, rally);
}
