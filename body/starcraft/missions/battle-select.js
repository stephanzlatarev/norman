import Mission from "../mission.js";
import Battle from "../battle/battle.js";
import { hotspots } from "../map/alert.js";

export default class BattleSelectMission extends Mission {

  run() {
    const battles = new Set();

    // Create or move battles
    for (const hotspot of hotspots) {
      let battle = Battle.list().find(battle => hotspot.zones.has(battle.zone));

      if (battle) {
        battle.setHotspot(hotspot);
      } else {
        battle = new Battle(hotspot);
      }

      battles.add(battle);
    }

    // Run all active battles. Close the inactive battles.
    for (const battle of Battle.list()) {
      if (battles.has(battle)) {
        battle.run();
      } else {
        battle.close();
      }
    }
  }

}
