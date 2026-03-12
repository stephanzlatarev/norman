import Memory from "../../../code/memory.js";
import { info } from "../log.js";
import Mission from "../mission.js";
import Depot from "../map/depot.js";
import { ActiveCount, TotalCount } from "../memo/count.js";

export default class MilestoneBasicEconomyMission extends Mission {

  run() {
    if (Memory.MilestoneBasicEconomy) return;

    if (isBasicEconomyEstablished()) {
      info("economy", "Milestone Basic Economy");
      Memory.MilestoneBasicEconomy = true;
    }
  }

}

function isBasicEconomyEstablished() {
  return (TotalCount.Probe >= 26) && (ActiveCount.Assimilator >= Depot.home.vespene.size);
}
