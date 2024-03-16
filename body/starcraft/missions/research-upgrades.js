import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Produce from "../jobs/produce.js";
import Count from "../memo/count.js";

const FACILITY = "Forge";
const UPGRADES = [
  "ProtossGroundWeaponsLevel1", "ProtossGroundArmorsLevel1",
  "ProtossGroundWeaponsLevel2", "ProtossGroundArmorsLevel2",
  "ProtossGroundWeaponsLevel3", "ProtossGroundArmorsLevel3",
  "ProtossShieldsLevel1", "ProtossShieldsLevel2", "ProtossShieldsLevel3",
];

export default class ResearchUpgradesMission extends Mission {

  job;
  done;

  run() {
    if (this.done) return;

    if (this.job) {
      if (this.job.isFailed || this.job.isDone) {
        this.job = null;
      } else {
        return;
      }
    }

    const upgrade = getUpgradeType();

    if (!upgrade) {
      this.done = true;
      return;
    }

    for (const facility of Units.buildings().values()) {
      if (facility.job) continue;
      if (!facility.isActive) continue;

      if (facility.type.name !== FACILITY) continue;

      this.job = new Produce(facility, upgrade);
    }
  }

}

function getUpgradeType() {
  for (const upgrade of UPGRADES) {
    if (!Count[upgrade]) {
      return Types.upgrade(upgrade);
    }
  }
}
