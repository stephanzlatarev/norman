import Battle from "./battle.js";
import Plan from "../memo/plan.js";
import Tiers from "../map/tier.js";
import { ALERT_RED } from "../map/alert.js";

export default function() {
  const battles = new Set();
  let tierLimit = Infinity;

  for (const tier of Tiers) {
    if (tier.level > tierLimit) break;

    const zones = orderBattleZones(tier.zones);

    for (const zone of zones) {
      if (zone.cells.size && (zone.alertLevel === ALERT_RED) && !isOverlapping(zone.range.zones, battles)) {
        const battle = findBattle(zone) || new Battle(zone);

        battle.move(zone);
        battles.add(findBattle(zone) || new Battle(zone));
      }

      if (zone.isWall && Plan.WallNatural) {
        tierLimit = zone.tier.level + 1;
      }
    }
  }

  return battles;
}

function orderBattleZones(zones) {
  return [...zones].sort((a, b) => ((a.workers.size !== b.workers.size) ? b.workers.size - a.workers.size : b.buildings.size - a.buildings.size));
}

function findBattle(zone) {
  return Battle.list().find(battle => battle.zones.has(zone));
}

function isOverlapping(zones, battles) {
  for (const battle of battles) {
    for (const zone of zones) {
      if (battle.zones.has(zone)) {
        return true;
      }
    }
  }
}
