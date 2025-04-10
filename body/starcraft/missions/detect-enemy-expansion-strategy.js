import Mission from "../mission.js";
import Plan from "../memo/plan.js";
import Units from "../units.js";

// Limit the number of bases to one until an enemy expansion is detected
export default class DetectEnemyExpansionStrategyMission extends Mission {

  enemyExpansionZones = new Set();
  isMissionComplete = false;

  run() {
    if (this.isMissionComplete) return;

    for (const enemy of Units.enemies().values()) {
      if (enemy.type.isDepot && enemy.zone) {
        this.enemyExpansionZones.add(enemy.zone);
      }

    }
    if (Plan.isBaseSupplyLimitReached()) {
      this.close("supply limit is reached");
    } else if (Plan.isBaseEstablished()) {
      this.close("base is established");
    } else if (this.enemyExpansionZones.size >= 2) {
      this.close("enemy expanded");
    } else if (Plan.BaseLimit !== Plan.ONE_BASE) {
      console.log("Mission 'Detect enemy expansion strategy' limits bases to 1.");
      Plan.setBaseLimit(this, Plan.ONE_BASE);
    }
  }

  close(details) {
    console.log("Mission 'Detect enemy expansion strategy' is over", details ? "because " + details : "");
    this.isMissionComplete = true;
    Plan.setBaseLimit(this, Plan.MULTI_BASE);
  }
}
