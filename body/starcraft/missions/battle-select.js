import Mission from "../mission.js";
import Battle from "../battle/battle.js";
import Zone from "../map/zone.js";

const ALERT_YELLOW = 4;

export default class BattleSelectMission extends Mission {

  run() {
    for (const zone of Zone.list()) {
      if (zone.alertLevel === ALERT_YELLOW) {
        if (!zone.battle) {
          zone.battle = new Battle(zone);
        }

        zone.battle.priority = 100 - zone.tier.level;

        zone.battle.run();
      } else if (zone.battle) {
        zone.battle.close();
      }
    }
  }

}
