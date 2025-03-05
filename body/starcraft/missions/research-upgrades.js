import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Produce from "../jobs/produce.js";
import { ActiveCount } from "../memo/count.js";

const UPGRADES = {
  Forge: [
    "ProtossGroundWeaponsLevel1", "ProtossGroundArmorsLevel1",
    "ProtossGroundWeaponsLevel2", "ProtossGroundArmorsLevel2",
    "ProtossGroundWeaponsLevel3", "ProtossGroundArmorsLevel3",
    "ProtossShieldsLevel1", "ProtossShieldsLevel2", "ProtossShieldsLevel3",
  ],
  RoboticsBay: [
    "ExtendedThermalLance"
  ],
  TwilightCouncil: [
    "Charge"
  ],
};

export default class ResearchUpgradesMission extends Mission {

  jobs = new Map();

  run() {
    for (const facility of Units.buildings().values()) {
      if (facility.job) continue;
      if (!facility.isActive) continue;
      if (facility.order.progress) continue;

      const job = this.jobs.get(facility);
      if (job && !job.isDone && !job.isFailed) continue;

      const upgrade = getUpgradeType(UPGRADES[facility.type.name]);

      if (upgrade) {
        this.jobs.set(facility, new Produce(facility, upgrade));
      }
    }
  }

}

function getUpgradeType(upgrades) {
  if (upgrades) {
    for (const upgrade of upgrades) {
      if (!ActiveCount[upgrade]) {
        return Types.upgrade(upgrade);
      }
    }
  }
}
