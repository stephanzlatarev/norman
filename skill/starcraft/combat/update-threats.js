import Battle from "./battle.js";
import { traceBattle } from "./trace.js";

export default function(battle) {
  if (battle.isMissionBattle) return;

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
  const remaining = [];

  for (const threat of battle.threats) {
    if (threat.type.movementSpeed && !threat.type.isWorker && threat.sector && !threat.sector.enemies.has(threat)) {
      threat.sector.untrackUnit(threat);
      cleared = true;
    } else {
      remaining.push(threat);
    }
  }

  if (cleared) battle.threats = remaining;

  return cleared;
}
