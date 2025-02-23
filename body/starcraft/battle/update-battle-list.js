import Battle from "./battle.js";
import Plan from "../memo/plan.js";
import Tiers from "../map/tier.js";
import { ALERT_RED, ALERT_YELLOW } from "../map/alert.js";

const RALLY_MIN_RADIUS = 4;

export default function() {
  const battles = new Set();
  const traversed = new Set();

  let tierLimit = Infinity;

  for (const tier of Tiers) {
    if (tier.level > tierLimit) break;

    const zones = orderBattleZones(tier.zones);

    for (const zone of zones) {
      if (traversed.has(zone)) continue;

      if (zone.alertLevel === ALERT_RED) {
        const battle = findBattle(zone) || new Battle(zone);
        const { zones, front } = findBattleZones(zone);

        battle.front = front;
        battle.zones = zones;

        battle.move(zone);
        battles.add(battle);

        for (const zone of zones) {
          traversed.add(zone);
        }
      }

      if (zone.isWall && Plan.WallNatural) {
        tierLimit = zone.tier.level + 1;
      }
    }
  }

  return battles;
}

function orderBattleZones(zones) {
  return [...zones].sort(function(a, b) {
    if (a.workers.size !== b.workers.size) return b.workers.size - a.workers.size;
    if (a.buildings.size !== b.buildings.size) return b.buildings.size - a.buildings.size;
    if (a.warriors.size !== b.warriors.size) return b.warriors.size - a.warriors.size;
    return a.cell.id - b.cell.id;
  });
}

function findBattle(zone) {
  return Battle.list().find(battle => battle.zones.has(zone));
}

function findBattleZones(zone) {
  const zones = new Set();
  const edges = new Set();
  const front = new Set();

  const traversed = new Set();
  let wave = new Set();

  zones.add(zone);
  traversed.add(zone);
  wave.add(zone);

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
      for (const neighbor of zone.neighbors) {
        if (traversed.has(neighbor)) continue;

        if ((neighbor.alertLevel === ALERT_YELLOW) && (neighbor.r >= RALLY_MIN_RADIUS)) {
          zones.add(neighbor);
          edges.add(neighbor);
        } else if (neighbor.alertLevel >= ALERT_YELLOW) {
          zones.add(neighbor);
          next.add(neighbor);
        } else {
          edges.add(neighbor);
        }

        traversed.add(neighbor);
      }
    }

    wave = next;
  }

  if (zone.tier.level === 1) {
    // The battle zone becomes the front line
    front.add(zone);
  } else if (zone.tier.level === 2) {
    // The lowest tier zone becomes the front line
    let approach = zone;

    for (const neighbor of zone.neighbors) {
      if (neighbor.tier.level < zone.tier.level) {
        approach = neighbor;
      }
    }

    front.add(approach);
  } else {
    // Front zones are the yellow alert levels that are at the edge of the battle
    for (const zone of edges) {
      if ((zone.alertLevel === ALERT_YELLOW) && (zone.r >= RALLY_MIN_RADIUS)) {
        front.add(zone);
      } else {
        let hasYellowNeighbor = false;

        for (const neighbor of zone.neighbors) {
          if (!zones.has(neighbor)) continue;

          if ((neighbor.alertLevel === ALERT_YELLOW) && (neighbor.r >= RALLY_MIN_RADIUS)) {
            hasYellowNeighbor = true;
            front.add(neighbor);
          }
        }

        if (!hasYellowNeighbor && (zone.r >= RALLY_MIN_RADIUS)) {
          front.add(zone);
        }
      }
    }
  }

  return { zones, front };
}
