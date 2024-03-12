import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Produce from "../jobs/produce.js";
import Resources from "../memo/resources.js";

const FACILITY = "Forge";
const UPGRADES = ["ProtossGroundWeaponsLevel1", "ProtossGroundArmorsLevel1", "ProtossShieldsLevel1"];

export default class ResearchUpgradesMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        this.job = null;
      } else if (this.job.isDone) {
        UPGRADES.splice(0, 1);
        this.job = null;
      } else {
        return;
      }
    }

    if (!UPGRADES.length) return;

    const upgrade = Types.get(UPGRADES[0]);

    for (const facility of Units.buildings().values()) {
      if (facility.type.name !== FACILITY) continue;

      if (!facility.isActive) continue;
      if (facility.order.abilityId) continue;

      if (Resources.minerals < upgrade.mineralCost) return;
      if (Resources.vespene < upgrade.vespeneCost) return;

      this.job = new Produce(upgrade.name, facility);

      Resources.minerals -= upgrade.mineralCost;
      Resources.vespene -= upgrade.vespeneCost;
    }
  }

}
