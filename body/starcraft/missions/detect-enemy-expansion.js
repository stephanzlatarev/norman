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

        // Check if this is a Command Center to be flying to an expansion
        if ((enemy.cell !== enemy.cell.zone.cell) && (enemy.type.name === "CommandCenter")) {
          this.enemyDepotZones.add(enemy.cell);
        }
      }
    }

    if (this.enemyDepotZones.size >= 2) {
      console.log("Enemy expansion detected.");
      Memory.DetectedEnemyExpansion = true;
    }
  }

}
