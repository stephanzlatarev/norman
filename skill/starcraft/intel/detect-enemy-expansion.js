import { Memory, Enemy, Units } from "./imports.js";

const enemyDepotZones = new Set();

export default function() {
  if (Memory.DetectedEnemyExpansion) return;

  // Expect the first enemy base
  enemyDepotZones.add(Enemy.base);

  for (const enemy of Units.enemies().values()) {
    if (enemy.type.isDepot && enemy.zone) {
      enemyDepotZones.add(enemy.zone);

      // Check if this is a Command Center to be flying to an expansion
      if ((enemy.cell !== enemy.cell.zone.cell) && (enemy.type.name === "CommandCenter")) {
        enemyDepotZones.add(enemy.cell);
      }
    }
  }

  if (enemyDepotZones.size >= 2) {
    console.log("Enemy expansion detected.");
    Memory.DetectedEnemyExpansion = true;
  }
}
