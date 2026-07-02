import Battle from "./battle.js";
import updateBattleBalance from "./update-battle-balance.js";
import updateBattleDetection from "./update-battle-detection.js";
import updateBattleFlags from "./update-battle-flags.js";
import updateBattleList from "./update-battle-list.js";
import updateBattleMarching from "./update-battle-marching.js";
import updateBattleMode from "./update-battle-mode.js";
import updateBattleSectors from "./update-battle-sectors.js";
import updateBattleStations from "./update-battle-stations.js";
import updateFighterPrio from "./update-fighter-prio.js";
import updateFighterStations from "./update-fighter-stations.js";
import updateFighterTargets from "./update-fighter-targets.js";
import updateFreeWarriors from "./update-free-warriors.js";
import updateIdleWarriors from "./update-idle-warriors.js";
import updateOpenJobs from "./update-open-jobs.js";
import updateThreats from "./update-threats.js";
import trace from "./trace.js";

const ops = [
  updateThreats,         // Ignore invisible threats for assaults without detector
  updateOpenJobs,        // Open fighter jobs for the active battles. Close obsolete jobs
  updateIdleWarriors,    // Assign idle warriors in battle zones to open fighter jobs
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
  const battles = updateBattleList();
  const list = [...battles].sort((a, b) => (b.priority - a.priority));

  updateBattleFlags(list);
  updateBattleSectors(list);

  for (const op of ops) {
    for (const battle of battles) {
      op(battle);
    }
  }

  for (const battle of Battle.list()) {
    if (!battles.has(battle)) {
      battle.close();
    }
  }

  // Idle warriors outside of battle zones should start moving to the closest battle as reinforcements
  updateFreeWarriors();

  trace();
}
