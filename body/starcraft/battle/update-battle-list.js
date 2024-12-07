import Battle from "./battle.js";
import Plan from "../memo/plan.js";
import { hotspots } from "../map/alert.js";

export default function() {
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
    if (Plan.WallNatural && (hotspot.center.tier.level > 2)) continue;

    if (battle) {
      battle.setHotspot(hotspot);
      battles.add(battle);
    } else {
      battles.add(new Battle(hotspot));
    }
  }

  return battles;
}

function getLowestsTierBattle(hotspot) {
  let bestBattle;
  let bestTierLevel = Infinity;

  for (const battle of Battle.list()) {
    if (!battle.zones.has(hotspot.center)) continue;

    if (!bestBattle || (battle.zone.tier.level < bestTierLevel)) {
      bestBattle = battle;
      bestTierLevel = battle.zone.tier.level;
    }
  }

  return bestBattle;
}
