import Battle from "./battle.js";
import { traceBattle } from "./trace.js";

export default function(battle) {
  const isAssault = (battle.mode === Battle.MODE_FIGHT) || (battle.mode === Battle.MODE_SMASH) || (battle.mode === Battle.MODE_WEAR);
  const hasDetector = battle.detector && battle.detector.assignee;

  if (isAssault && !hasDetector) {
    if (ignoreInvisibleThreats(battle.zone)) {
      traceBattle(battle, "cleared invisible threats");
    }
  }
}

function ignoreInvisibleThreats(zone) {
  const threats = zone.threats;
  const visible = zone.enemies;
  const count = threats.size;

  for (const threat of threats) {
    if (!visible.has(threat)) {
      threats.delete(threat);
    }
  }

  return (threats.size !== count);
}
