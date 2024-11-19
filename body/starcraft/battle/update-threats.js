import Battle from "./battle.js";

export default function(battle) {
  const isAssault = (battle.mode === Battle.MODE_FIGHT) || (battle.mode === Battle.MODE_SMASH);
  const hasDetector = battle.detector && battle.detector.assignee;

  if (isAssault && !hasDetector) {
    ignoreInvisibleThreats(battle.zone);
  }
}

function ignoreInvisibleThreats(zone) {
  const threats = zone.threats;
  const visible = zone.enemies;

  for (const threat of threats) {
    if (!visible.has(threat)) {
      threats.delete(threat);
    }
  }
}
