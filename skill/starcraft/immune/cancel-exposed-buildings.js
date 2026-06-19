import { Depot, Memory, Order } from "./imports.js";

export default function() {
  if (Memory.FlagSiegeDefense) return;
  if (Memory.DeploymentOutreach !== Memory.DeploymentOutreachSiegeDefense) return;
  if (Memory.LevelEnemyArmySuperiority < 2) return;

  for (const zone of Depot.list()) {
    if (zone === Depot.home) continue;
    if (zone.warriors.size > zone.enemies.size) continue;

    for (const building of zone.buildings) {
      if (building.buildProgress < 1) {
        new Order(building, 3659).accept(true);
      }
    }
  }
}
