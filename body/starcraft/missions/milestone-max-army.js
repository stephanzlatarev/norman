import Memory from "../../../code/memory.js";
import Mission from "../mission.js";
import Resources from "../memo/resources.js";

export default class MilestoneMaxArmyMission extends Mission {

  run() {
    if (Memory.MilestoneMaxArmy) return;

    if (isArmyMaxedOut()) {
      console.log("Milestone Max Army");
      Memory.MilestoneMaxArmy = true;
    }
  }

}

function isArmyMaxedOut() {
  return (Resources.supplyUsed >= 196);
}
