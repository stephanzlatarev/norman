import Battle from "./battle.js";
import { traceBattle } from "./trace.js";

export default function(battle) {
  const isAssault = (battle.mode === Battle.MODE_FIGHT) || (battle.mode === Battle.MODE_SMASH) || (battle.mode === Battle.MODE_WEAR);
  const hasDetector = battle.detector && battle.detector.assignee;

  if (isAssault && !hasDetector) {
    if (ignoreInvisibleMobileThreats(battle)) {
      traceBattle(battle, "cleared invisible mobile threats");
    }
  }
}

function ignoreInvisibleMobileThreats(battle) {
  let cleared = false;

  for (const sector of battle.sectors) {
    for (const threat of sector.threats) {
      if (threat.type.movementSpeed && !sector.enemies.has(threat)) {
        sector.clearThreat(threat);
        cleared = true;
      }
    }
  }

  return cleared;
}
