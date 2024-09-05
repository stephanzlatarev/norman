import Mission from "../mission.js";
import Battle from "../battle/battle.js";

export default class BattleIgnoreInvisibleThreatsMission extends Mission {

  run() {
    for (const battle of Battle.list()) {
      if (battle.detector && battle.detector.assignee) continue;

      if (battle.mode === Battle.MODE_FIGHT) {
        ignoreInvisibleThreats(battle.zone);
      } else if (battle.mode === Battle.MODE_SMASH) {
        ignoreInvisibleThreats(battle.zone);
      }
    }
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
