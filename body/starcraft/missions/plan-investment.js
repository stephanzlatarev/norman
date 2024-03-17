import Mission from "../mission.js";
import Count from "../memo/count.js";
import Limit from "../memo/limit.js";
import Priority from "../memo/priority.js";

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
      Priority.Nexus = 70;
      Limit.Nexus = Math.floor(Count.Gateway / 3) + 2;
      Limit.Assimilator = (Count.Nexus - 1) * 2;

      Priority.Gateway = 50;
      Limit.Gateway = (Count.Nexus - 1) * 3;
      Limit.Forge = (Count.Gateway >= 3) ? 1 : 0;

      Limit.CyberneticsCore = 1;
      Limit.RoboticsFacility = 1;
    }
  }

}
