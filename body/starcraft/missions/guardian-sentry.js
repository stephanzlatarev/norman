import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import { ActiveCount } from "../memo/count.js";
import Resources from "../memo/resources.js";

const SHIELD_TIME = 280;

export default class GuardianSentry extends Mission {

  order = null;

  run() {
    if (ActiveCount.Sentry === 0) return;

    if (this.order && !this.order.isRejected && this.order.unit.isAlive) {
      // Wait until the previous order is accepted by the sentry
      if (!this.order.isAccepted) return;

      // Wait unit the previous guardian shield wears off
      if (Resources.loop - this.order.timeIssued <= SHIELD_TIME) return;
    }

    for (const unit of Units.warriors().values()) {
      if (unit.type.name !== "Sentry") continue;
      if (unit.order.abilityId !== 23) continue;
      if (unit.energy < 75) continue;

      const energy = unit.energy;

      this.order = new Order(unit, 76).accept(order => (order.unit.energy < energy));

      break;
    }
  }

}
