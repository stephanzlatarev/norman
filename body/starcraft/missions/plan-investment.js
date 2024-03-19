import Mission from "../mission.js";
import Count from "../memo/count.js";
import Limit from "../memo/limit.js";
import Priority from "../memo/priority.js";
import Resources from "../memo/resources.js";

let stage = 0;

export default class PlanInvestmentsMission extends Mission {

  run() {
    if (stage === 0) {
      Priority.Gateway = 70;
      Limit.Gateway = 1;

      Priority.Nexus = 50;
      Limit.Nexus = 2;

      Limit.Assimilator = 0;
      Limit.CyberneticsCore = 0;
      Limit.Forge = 0;

      if (Count.Nexus > 1) {
        // Transition to stage 1
        stage = 1;
      }
    } else {
      if (Resources.supplyLimit < 198) {
        Priority.Nexus = 70;
        Limit.Nexus = Math.floor((Count.Gateway + Count.RoboticsFacility) / 3) + 2;
      } else {
        Priority.Nexus = 40;
        Limit.Nexus = Infinity;
      }
      Limit.Assimilator = (Count.Nexus - 1) * 2;

      Priority.Gateway = 50;
      Limit.Gateway = Math.floor(Math.min(
          (Count.Nexus - 1) * 3,                       // Gateways should not grow more than nexuses
          Count.Probe / 12 - Count.RoboticsFacility,   // Gateways should not grow more than income
          Count.RoboticsFacility ? Infinity : 1,       // Prioritize first Robotics facility before second Gateway
      ));
      Limit.RoboticsFacility = 1;

      Limit.Forge = (Count.Gateway >= 3) ? 1 : 0;
      Limit.CyberneticsCore = 1;
    }
  }

}
