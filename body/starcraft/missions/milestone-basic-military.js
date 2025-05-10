import Memory from "../../../code/memory.js";
import Mission from "../mission.js";
import { ActiveCount } from "../memo/count.js";

export default class MilestoneBasicMilitaryMission extends Mission {

  run() {
    if (Memory.MilestoneBasicMilitary) return;

    if (isBasicMilitaryEstablished()) {
      console.log("Milestone Basic Military");
      Memory.MilestoneBasicMilitary = true;
    }
  }

}

function isBasicMilitaryEstablished() {
  if (!ActiveCount.Gateway) return false;
  if (!ActiveCount.CyberneticsCore) return false;
  if (!ActiveCount.Observer) return false;

  return (ActiveCount.Stalker >= 4);
}
