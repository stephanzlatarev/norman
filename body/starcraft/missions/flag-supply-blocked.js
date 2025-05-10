import Memory from "../../../code/memory.js";
import Mission from "../mission.js";
import Job from "../job.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import Resources from "../memo/resources.js";

export default class SupplyBlockedMission extends Mission {

  run() {
    if (isSupplyBlocked()) {
      if (!Memory.FlagSupplyBlocked) console.log("Flag Supply Blocked");

      Memory.FlagSupplyBlocked = true;
    } else {
      Memory.FlagSupplyBlocked = false;
    }
  }

}

function isSupplyBlocked() {
    if (Resources.supplyUsed >= 196) return true;
    if (Resources.supply >= 4) return false;
    if (TotalCount.Pylon > ActiveCount.Pylon) return false;

    for (const job of Job.list()) {
      if (job.output && job.output.name && (job.output.name === "Pylon")) return false;
    }

    return true;
}  
