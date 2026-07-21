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
    if (!isContactZone(zone)) continue;
    if (isThreatenedZone(zone)) continue;

    const battle = getBattle(zone);

    battle.isCleanupBattle = true;
    battle.mode = Battle.MODE_SMASH;

    cleanups.push(battle);
  }

  return cleanups;
}

function isFightsZone(fights, zone) {
  for (const fight of fights) {
    if (fight.front === zone) return true;
  }
}

function isThreatenedZone(zone) {
  if (zone.isDepot) {
    // Depot zones are cleaned up more aggressively
    for (const threat of zone.threats()) {
      if (threat.type.isWorker) continue;

      return true;
    }
  } else {
    // We are more cautious about non-depot zones
    for (const sector of zone.horizon) {
      for (const threat of sector.threats) {
        if (threat.type.isWorker) continue;

        return true;
      }
    }
  }
}

function isContactZone(zone) {
  for (const sector of zone.sectors) {
    for (const contact of sector.contacts) {
      // Only clean up zones with static structures
      if (!contact.type.movementSpeed) continue;

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
