import Memory from "../../../code/memory.js";
import Battle from "./battle.js";
import Enemy from "../memo/enemy.js";
import Depot from "../map/depot.js";
import Tiers from "../map/tier.js";
import { ALERT_RED, ALERT_YELLOW } from "../map/alert.js";
import { TotalCount } from "../memo/count.js";

const RALLY_MIN_RADIUS = 4;

export default function() {
  const battles = new Set();

  if (!Memory.EnemyArmyIsSuperior) {
    const traversed = new Set();
    const tierLevelLimit = Memory.ModeCombatDefend ? 1 : Infinity;

    for (const tier of Tiers) {
      if (tier.level > tierLevelLimit) break;

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
      }
    }
  }

  if (!battles.size) {
    let battleZone = Depot.home;

    if (Memory.ModeCombatDefend) {
      battleZone = findFrontBaseZone();
    } else if (Enemy.base && !Enemy.base.warriors.size) {
      battleZone = Enemy.base;
    }

    const battle = findBattle(battleZone) || new Battle(battleZone);

    if (!battle.front.size) {
      battle.front.add(battleZone);
    }

    if (battleZone !== Enemy.base) {
      // Add all zones in range to the battle so that defenders can attack them
      for (const zone of battleZone.range.zones) {
        battle.zones.add(zone);
      }
    }

    battles.clear();
    battles.add(battle);
  }

  return battles;
}

function findFrontBaseZone() {
  if ((TotalCount.Nexus === 1) || (Depot.home.alertLevel >= ALERT_RED)) {
    return Depot.home;
  }

  let frontThreatened;
  let frontSecure;

  for (const zone of Depot.list()) {
    if (!zone.depot) continue;
    if (zone.alertLevel >= ALERT_RED) return zone;
    if (zone.alertLevel >= ALERT_YELLOW) frontThreatened = zone;

    frontSecure = zone;
  }

  return frontThreatened || frontSecure || Depot.home;
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
  const front = new Set();

  const traversed = new Set();
  let wave = new Set();
  let isFrontLocked = false;

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

          if (!isFrontLocked) front.add(neighbor);
        } else if (neighbor.alertLevel >= ALERT_YELLOW) {
          zones.add(neighbor);
          next.add(neighbor);
        } else if (!isFrontLocked) {
          front.add(neighbor);
        }

        traversed.add(neighbor);
      }
    }

    wave = next;
    isFrontLocked = front.size;
  }

  if (zone.tier.level === 1) {
    // The battle zone becomes the front line
    front.clear();
    front.add(zone);
  } else if (zone.tier.level === 2) {
    // The lowest tier zone becomes the front line
    let approach = zone;

    for (const neighbor of zone.neighbors) {
      if (neighbor.tier.level < zone.tier.level) {
        approach = neighbor;
      }
    }

    front.clear();
    front.add(approach);
  }

  return { zones, front };
}
