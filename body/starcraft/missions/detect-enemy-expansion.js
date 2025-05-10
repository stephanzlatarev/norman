import Memory from "../../../code/memory.js";
import Mission from "../mission.js";
import Units from "../units.js";

export default class DetectEnemyExpansionMission extends Mission {

  enemyDepotZones = new Set();

  run() {
    if (Memory.DetectedEnemyExpansion) return;

    for (const enemy of Units.enemies().values()) {
      if (enemy.type.isDepot && enemy.zone) {
        this.enemyDepotZones.add(enemy.zone);
      }
    }

    if (this.enemyDepotZones.size >= 2) {
      console.log("Enemy expansion detected.");
      Memory.DetectedEnemyExpansion = true;
    }
  }

}
