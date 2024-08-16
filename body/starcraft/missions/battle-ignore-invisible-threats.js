import Mission from "../mission.js";
import Battle from "../battle/battle.js";
import Zone from "../map/zone.js";

export default class BattleIgnoreInvisibleThreatsMission extends Mission {

  run() {
    for (const zone of Zone.list()) {
      if (!zone.battle) continue;
      if (zone.battle.detector && zone.battle.detector.assignee) continue;

      if (zone.battle.mode === Battle.MODE_FIGHT) {
        ignoreInvisibleThreats(zone);
      } else if (zone.battle.mode === Battle.MODE_SMASH) {
        ignoreInvisibleThreats(zone);
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
