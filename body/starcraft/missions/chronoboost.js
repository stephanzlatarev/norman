import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";

//TODO: List Produce jobs by priority and chronoboost the top
export default class ChronoboostMission extends Mission {

  run() {
    for (const nexus of Units.buildings().values()) {
      if (nexus.type.name !== "Nexus") continue;
      if (!nexus.isActive) continue;
      if (nexus.energy < 50) continue;

      if (nexus.order.progress && (nexus.boost === 0)) {
        new Order(nexus, 3755, nexus, isAcknowledged);
      }
    }
  }

}

function isAcknowledged(order) {
  return (order.target.boost > 0);
}
