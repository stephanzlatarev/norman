import Memory from "../../../code/memory.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import Depot from "../map/depot.js";

export default class LimitBaseMission extends Mission {

  run() {
    const limitBase = Memory.LimitBase;

    if (Memory.ExpectEnemyRush) {
      Memory.LimitBase = 1;
    } else {
      Memory.LimitBase = Depot.list().length;
    }

    if (Memory.LimitBase < limitBase) {
      cancelExposedConstructions();
    }
  }

}

function cancelExposedConstructions() {
  for (const building of Units.buildings().values()) {
    // Keep all buildings in the home base
    if (building.zone === Depot.home) continue;

    // Keep the Gateway so that in case it finishes we can start a CyberneticsCore sooner
    if (building.type.name === "Gateway") continue;

    // Keep CyberneticsCore if it's halfway ready.
    if ((building.type.name === "CyberneticsCore") && (building.buildProgress > 0.5)) continue;

    if (building.buildProgress < 1) {
      new Order(building, 3659).accept(true);
    }
  }
}
