import Battle from "./battle.js";
import Plan from "../memo/plan.js";

export default function(battle) {
  if (Plan.BaseLimit) return;

  const isAssault = (battle.mode === Battle.MODE_FIGHT) || (battle.mode === Battle.MODE_SMASH);
  const hasDetector = battle.detector && battle.detector.assignee;

  if (isAssault && !hasDetector) {
    ignoreInvisibleThreats(battle.zone);
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

  if (threats.size !== count) console.log("Zone", zone.name, "cleared of invisible threats");
}
