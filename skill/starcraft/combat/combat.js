import { ActiveCount, Memory, ALERT_RED } from "./imports.js";
import Battle from "./battle.js";
import listHotspots from "./list-hotspots.js";
import updateBattleBalance from "./update-battle-balance.js";
import updateBattleDetection from "./update-battle-detection.js";
import updateBattleMarching from "./update-battle-marching.js";
import updateBattleMode from "./update-battle-mode.js";
import updateBattleStations from "./update-battle-stations.js";
import updateFighterPrio from "./update-fighter-prio.js";
import updateFighterStations from "./update-fighter-stations.js";
import updateFighterTargets from "./update-fighter-targets.js";
import updateFreeWarriors from "./update-free-warriors.js";
import updateIdleWarriors from "./update-idle-warriors.js";
import updateOpenJobs from "./update-open-jobs.js";
import updateThreats from "./update-threats.js";
import trace from "./trace.js";

const MAX_BATTLE_PRIORITY = 90;

const BATTLE_OPS = [
  updateThreats,         // Ignore invisible threats for assaults without detector
  updateBattleBalance,   // Update the balance scores for each battle
  updateBattleMode,      // Update the mode for each battle
  updateBattleMarching,  // Update the progress data on battle marching
  updateBattleStations,  // Assign stations to battle based on the fighter jobs
  updateFighterStations, // Assign fighter jobs to stations
  updateFighterTargets,  // Focus fire in each battle
  updateFighterPrio,     // Update the priority of fighter jobs
  updateBattleDetection, // Assign a detector to the battle if needed
];

export default function() {
  mapHotspotsToBattles(selectHotspots());
  prioritizeBattles();

  updateBattleScreen();

  for (const battle of Battle.list()) {
    for (const op of BATTLE_OPS) {
      op(battle);
    }
  }

  updateOpenJobs();
  updateIdleWarriors();
  updateFreeWarriors();

  trace();
}

function selectHotspots() {
  const hotspots = listHotspots();
  const prioritized = [...hotspots.values()].sort((a, b) => (a.level - b.level));
  const selected = [];

  Memory.FlagAvoidTrenches = prioritized.some(hotspot => (hotspot.isNormalHotspot && !hotspot.isTrenchHotspot));
  Memory.LimitMissions = (Memory.DeploymentOutreach >= Memory.DeploymentOutreachProbingAttack) ? calculateMissionsLimit() : Infinity;

  let focusHotspot;
  let missions = Memory.LimitMissions;

  for (const hotspot of prioritized) {
    if (hotspot.isNormalHotspot) {
      selected.push(hotspot);
      focusHotspot = hotspot;
    } else if (hotspot.isTrenchHotspot) {
      if (!Memory.FlagAvoidTrenches) selected.push(hotspot);
    } else if (hotspot.isMissionHotspot) {
      if (missions-- > 0) selected.push(hotspot);
    } else {
      selected.push(hotspot);
    }
  }

  if (focusHotspot) {
    // Draw back the focus hotspot closer to homebase when its rally zone is a hotspot too
    const originalHotspot = focusHotspot;
    let drawBackHotspot = getDrawBackHotspot(hotspots, focusHotspot);

    while (drawBackHotspot) {
      selected.splice(selected.indexOf(focusHotspot), 1);
      if (selected.indexOf(drawBackHotspot) < 0) selected.push(drawBackHotspot);

      focusHotspot = drawBackHotspot;
      drawBackHotspot = getDrawBackHotspot(hotspots, focusHotspot);
    }

    focusHotspot.copyFlags(originalHotspot);
    focusHotspot.isFocusHotspot = true;
  } else if (selected.length) {
    // When all battles are cleanup, intercept, or trench, focus on a non-empty battle that is closest to the enemy
    for (let i = selected.length - 1; i >= 0; i--) {
      if (!selected[i].isEmptyHotspot) {
        selected[i].isFocusHotspot = true;
        focusHotspot = selected[i];
        break;
      }
    }

    if (!focusHotspot) {
      selected[selected.length - 1].isFocusHotspot = true;
    }
  }

  return selected;
}

function getDrawBackHotspot(hotspots, hotspot) {
  // Do not draw back from depot zones
  if (hotspot.zone.isDepot) return null;
  if (hotspot.rally.isDepot) return null;

  // Do not draw back from contained hotspots
  if (hotspot.rally === hotspot.zone) return null;

  const rallyHotspot = hotspots.get(hotspot.rally);

  // Do not draw back if the rally zone is not a hotspot
  if (!rallyHotspot) return null;

  // Do not draw back because of a cleanup hotspot
  if (rallyHotspot.isCleanupHotspot) return null;

  return rallyHotspot;
}

function calculateMissionsLimit(warriorCount) {  
  if (Memory.DeploymentOutreach < Memory.DeploymentOutreachProbingAttack) return 0;

  const warriors = ActiveCount.Zealot + ActiveCount.Stalker + ActiveCount.Sentry + ActiveCount.Immortal + ActiveCount.Colossus;

  if (warriors >= 24) return 3;
  if (warriors >= 18) return 2;
  if (warriors >= 12) return 1;

  return 0;
}

function mapHotspotsToBattles(hotspots) {
  const previous = new Set(Battle.list());
  const current = new Set();

  hotspots.sort((a, b) => (a.level - b.level));

  // First, map same zone
  for (const hotspot of hotspots) {
    const battle = Battle.list().find(one => (one.front === hotspot.zone));

    if (battle) {
      current.add(hotspot.map(battle));
      hotspot.isMapped = true;
    }
  }

  // Second, map route zones
  for (const hotspot of hotspots) {
    if (hotspot.isMapped) continue;

    const battle = Battle.list().find(one => (one.front.backward === hotspot.zone) && !current.has(one));

    if (battle) {
      current.add(hotspot.map(battle));
      hotspot.isMapped = true;
    }
  }

  // Third, map neighbor zones
  for (const hotspot of hotspots) {
    if (hotspot.isMapped) continue;

    const battle = Battle.list().find(one => one.front.neighbors.has(hotspot.zone) && !current.has(one));

    if (battle) {
      current.add(hotspot.map(battle));
      hotspot.isMapped = true;
    }
  }

  // Fourth, create other battles
  for (const hotspot of hotspots) {
    if (hotspot.isMapped) continue;

    current.add(hotspot.map(new Battle(hotspot.zone, hotspot.rally)));
  }

  // Finally, close outdated battles
  for (const battle of previous) {
    if (!current.has(battle)) {
      battle.close();
    }
  }

  const isSingleBattle = (current.size === 1);
  for (const battle of current) {
    battle.isOnlyBattle = isSingleBattle;
  }
}

function prioritizeBattles() {
  const battles = Battle.list().sort((a, b) => (a.level - b.level));
  let priority = MAX_BATTLE_PRIORITY;

  for (const battle of battles) {
    battle.priority = priority--;
  }
}

/*
For each battle, sectors is the union of the horizon sectors of the front and rally zones.
The screen maps each sector to the influence weight of the battle over that sector.

When a sector belongs to only one battle, its weight is 1.0.
When a sector is shared between battles, weights are distributed proportionally to the inverse
of the squared distance between the sector and each battle's front sector, summing to 1.0.
If the sector is the front sector of a battle, that battle gets weight 1.0.
*/
function updateBattleScreen() {
  const battles = Battle.list();

  if (battles.length === 1) {
    updateSingleBattleScreen(battles[0]);
  } else if (battles.length > 1) {
    updateMultipleBattlesScreen(battles);
  }
}

function updateSingleBattleScreen(battle) {
  battle.screen = new Map();

  for (const sector of battle.sectors) {
    battle.screen.set(sector, 1.0);
  }
}

function updateMultipleBattlesScreen(battles) {
  for (const battle of battles) {
    battle.screen = new Map();
  }

  const sectorClaims = new Map();

  for (let index = 0; index < battles.length; index++) {
    const front = battles[index].front.cell.sector;

    for (const sector of battles[index].sectors) {
      if (!sectorClaims.has(sector)) sectorClaims.set(sector, []);

      const dr = sector.row - front.row;
      const dc = sector.col - front.col;
      const distance = dr * dr + dc * dc;
      sectorClaims.get(sector).push({ index, distance });
    }
  }

  for (const [sector, claims] of sectorClaims) {
    if (claims.length === 1) {
      battles[claims[0].index].screen.set(sector, 1.0);
    } else {
      const frontClaim = claims.find(c => c.distance === 0);

      if (frontClaim) {
        battles[frontClaim.index].screen.set(sector, 1.0);
      } else {
        const inverseDistances = claims.map(c => 1 / c.distance);
        const total = inverseDistances.reduce((a, b) => a + b, 0);

        for (let i = 0; i < claims.length; i++) {
          battles[claims[i].index].screen.set(sector, inverseDistances[i] / total);
        }
      }
    }
  }
}
