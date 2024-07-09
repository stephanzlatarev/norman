import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import Zone from "../map/zone.js";
import { ActiveCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";
import Resources from "../memo/resources.js";

// TODO: Maintain up to 2 hallucinated phoenixes at a time for better map coverage
// TODO: Create scouts when visible enemies are only at tier 2 or higher
// TODO: Maneuver the scout in zones where there are enemies that can shoot air
export default class ScoutSentry extends Mission {

  order = null;
  scout = null;
  target = null;

  run() {
    for (const zone of Zone.list()) {
      if (zone.warriors.size || zone.buildings.size || (this.scout && this.scout.zone === zone)) {
        zone.lastScoutTime = Resources.loop;
      } else if (!zone.lastScoutTime) {
        zone.lastScoutTime = -1;
      }
    }

    if (!this.scout || !this.scout.isAlive) {
      this.scout = this.createScout();
    }

    if (this.scout && this.scout.isAlive) {
      this.moveScout();
    }
  }

  createScout() {
    if (VisibleCount.Warrior) return;
    if (!ActiveCount.Sentry) return;

    for (const unit of Units.hallucinations().values()) {
      if (unit.type.name === "Phoenix") return unit;
    }

    // Wait until the previous order is accepted by the sentry
    if (this.order && this.order.unit.isAlive && !this.order.isRejected && !this.order.isAccepted) return;

    const sentry = selectSentry();

    if (sentry) {
      const energyBeforeOrder = sentry.energy;

      this.order = new Order(sentry, 154).accept(() => (sentry.energy < energyBeforeOrder));
    }
  }

  moveScout() {
    if (!this.target || isSamePosition(this.scout.body, this.target)) {
      this.target = getTarget(this.scout);
    }

    if (this.target) {
      orderMove(this.scout, this.target);
    }
  }

}

function selectSentry() {
  for (const unit of Units.warriors().values()) {
    if (unit.type.name !== "Sentry") continue;
    if (unit.energy < 75) continue;

    return unit;
  }
}

function getTarget(scout) {
  if (!scout.zone) return;

  let best = scout.zone;
  let bestScoutTime = scout.zone.lastScoutTime;
  let bestTierLevel = scout.zone.tier.level;

  for (const zone of Zone.list()) {
    if (zone.isCorridor) continue;

    if ((zone.lastScoutTime < bestScoutTime) || ((zone.lastScoutTime === bestScoutTime) && (zone.tier.level > bestTierLevel))) {
      best = zone;
      bestScoutTime = zone.lastScoutTime;
      bestTierLevel = zone.tier.level;
    }
  }

  return best;
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 2) && (Math.abs(a.y - b.y) < 2);
}

function orderMove(unit, pos) {
  if (!unit || !unit.order || !pos) return;

  if ((unit.order.abilityId !== 16) || !unit.order.targetWorldSpacePos || !isSamePosition(unit.order.targetWorldSpacePos, pos)) {
    new Order(unit, 16, pos).accept(true);;
  }
}

