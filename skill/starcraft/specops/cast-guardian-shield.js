import { ActiveCount, Order, Resources, Units } from "./imports.js";

const SHIELD_TIME = 280;

let order = null;

export default function() {
  if (ActiveCount.Sentry === 0) return;

  if (order && !order.isRejected && order.unit.isAlive) {
    // Wait until the previous order is accepted by the sentry
    if (!order.isAccepted) return;

    // Wait unit the previous guardian shield wears off
    if (Resources.loop - order.timeIssued <= SHIELD_TIME) return;
  }

  for (const unit of Units.warriors().values()) {
    if (unit.type.name !== "Sentry") continue;
    if (unit.order.abilityId !== 23) continue;
    if (unit.energy < 75) continue;

    const energy = unit.energy;

    order = new Order(unit, 76).accept(order => (order.unit.energy < energy));

    break;
  }
}
