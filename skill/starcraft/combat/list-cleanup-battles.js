import { Memory, Zone } from "./imports.js";
import Battle from "./battle.js";

export default function(fights) {
  if (Memory.DeploymentOutreach >= Memory.DeploymentOutreachProbingAttack) {
    return listCleanupBattles(fights);
  }

  return [];
}

function listCleanupBattles(fights) {
  const cleanups = [];

  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;
    if (isFightsZone(fights, zone)) continue;
    if (isThreatZone(zone)) continue;
    if (!isContactZone(zone)) continue;

    const battle = getBattle(zone);

    battle.mode = Battle.MODE_SMASH;

    cleanups.push(battle);
  }

  return cleanups;
}

function isFightsZone(fights, zone) {
  for (const fight of fights) {
    if (fight.front === zone) return true;
    if (fight.front.neighbors.has(zone)) return true;
  }
}

function isThreatZone(zone) {
  for (const sector of zone.sectors) {
    for (const threat of sector.threats) {
      if (threat.zone && (threat.zone === zone)) {
        return true;
      }
    }
  }
}

function isContactZone(zone) {
  for (const sector of zone.sectors) {
    for (const contact of sector.contacts) {
      if (contact.zone && (contact.zone === zone)) {
        return true;
      }
    }
  }
}

function getBattle(zone) {
  for (const battle of Battle.list()) {
    if (battle.front === zone) {
      return battle.move(zone, zone);
    }
  }

  return new Battle(zone, zone);
}
