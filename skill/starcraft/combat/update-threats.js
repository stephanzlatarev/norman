import Battle from "./battle.js";
import { traceBattle } from "./trace.js";

export default function(battle) {
  const isAssault = (battle.mode === Battle.MODE_FIGHT) || (battle.mode === Battle.MODE_WEAR);
  const hasDetector = battle.detector && battle.detector.assignee;

  if (isAssault && !hasDetector) {
    if (clearInvisibleMobileThreats(battle)) {
      traceBattle(battle, "cleared invisible mobile threats");
    }
  }
}

function clearInvisibleMobileThreats(battle) {
  let cleared = false;

  for (const sector of battle.sectors) {
    for (const threat of sector.threats) {
      if (!threat.type.movementSpeed) continue;
      if (threat.type.isWorker) continue;
      if (sector.enemies.has(threat)) continue;

      sector.untrackUnit(threat);
      cleared = true;
    }
  }

  return cleared;
}
