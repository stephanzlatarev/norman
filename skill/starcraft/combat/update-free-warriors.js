import { Depot, Order, Units } from "./imports.js";

export default function() {
  for (const warrior of Units.warriors().values()) {
    if (!warrior.isAlive) continue;
    if (!warrior.type.movementSpeed) continue;
    if (warrior.job) continue;

    if (!warrior.order.abilityId) {
      Order.move(warrior, Depot.home);
    }
  }
}
