import Mission from "../mission.js";
import Battle from "../battle/battle.js";
import { hotspots } from "../map/alert.js";

export default class BattleSelectMission extends Mission {

  run() {
    const battles = new Set();
    const battleToHotspot = new Map();
    const hotspotToBattle = new Map();

    // Map hotspots to existing battles
    for (const hotspot of hotspots) {
      const battle = getLowestsTierBattle(hotspot);
      const otherHotspot = battleToHotspot.get(battle);

      if (otherHotspot) {
        if (hotspot.center.tier.level < otherHotspot.center.tier.level) {
          battleToHotspot.set(battle, hotspot);
          hotspotToBattle.set(hotspot, battle);
          hotspotToBattle.delete(otherHotspot);
        }
      } else {
        battleToHotspot.set(battle, hotspot);
        hotspotToBattle.set(hotspot, battle);
      }
    }

    // Create or move battles
    for (const [hotspot, battle] of hotspotToBattle) {
      if (battle) {
        battle.setHotspot(hotspot);
        battles.add(battle);
      } else {
        battles.add(new Battle(hotspot));
      }
    }

    // Run all active battles. Close the inactive battles.
    for (const battle of Battle.list()) {
      if (battles.has(battle)) {
        battle.run();
      } else {
        battle.close();
      }
    }
  }

}

function getLowestsTierBattle(hotspot) {
  let bestBattle;
  let bestTierLevel = Infinity;

  for (const battle of Battle.list()) {
    if (!areOverlapping(hotspot.center.range.zones, battle.zones)) continue;

    if (!bestBattle || (battle.zone.tier.level < bestTierLevel)) {
      bestBattle = battle;
      bestTierLevel = battle.zone.tier.level;
    }
  }

  return bestBattle;
}

function areOverlapping(a, b) {
  for (const one of a) {
    if (b.has(one)) return true;
  }

  for (const one of b) {
    if (a.has(one)) return true;
  }
}
