import Mission from "../mission.js";
import Count from "../memo/count.js";
import Limit from "../memo/limit.js";

let stage = 0;

export default class PlanInvestmentsMission extends Mission {

  run() {
    if (stage === 0) {
      Limit.Gateway = 1;

      if (Count.Nexus > 1) {
        // Transition to stage 1
        stage = 1;
      }
    } else {
      Limit.Gateway = (Count.Nexus - 1) * 3;
      Limit.Nexus = Math.floor(Count.Gateway / 3) + 2;
    }
  }

}