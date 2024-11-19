import Battle from "./battle.js";
import updateBattleBalance from "./update-battle-balance.js";
import updateBattleDetection from "./update-battle-detection.js";
import updateBattleLines from "./update-battle-lines.js";
import updateBattleList from "./update-battle-list.js";
import updateBattleMode from "./update-battle-mode.js";
import updateFighterPrio from "./update-fighter-prio.js";
import updateFighterStations from "./update-fighter-stations.js";
import updateFighterTargets from "./update-fighter-targets.js";
import updateJobsToLines from "./update-jobs-to-lines.js";
import updateIdleWarriors from "./update-idle-warriors.js";
import updateLineStations from "./update-line-stations.js";
import updateOpenJobs from "./update-open-jobs.js";
import updateThreats from "./update-threats.js";
import trace from "./trace.js";

// TODO: First iteration, there's one station at the center of the battle line
// TODO: Second iteration, there are as many stations as fighter jobs
// TODO: Third iteration, the battle line moves

const ops = [
  updateThreats,         // Ignore invisible threats for assaults without detector
  updateBattleLines,     // Mark the active battle lines
  updateOpenJobs,        // Open fighter jobs for the active battles. Close obsolete jobs
  updateIdleWarriors,    // Assign idle warriors in battle zones to open fighter jobs
  updateJobsToLines,     // Distribute all fighter jobs to active battle lines
  updateBattleBalance,   // Update the balance scores for each battle
  updateBattleMode,      // Update the mode for each battle
  updateLineStations,    // Assign stations to battle lines based on the fighter jobs
  updateFighterStations, // Assign the fighter jobs of each battle line to the stations in the battle line
  updateFighterTargets,  // Focus fire in each battle
  updateFighterPrio,     // Update the priority of fighter jobs
  updateBattleDetection, // Assign a detector to the battle if needed
];

export default function() {
  const battles = updateBattleList();
  const focusBattle = selectFocusBattle(battles);

  for (const op of ops) {
    for (const battle of battles) {
      const isFocusBattle = (battle === focusBattle);

      op(battle, isFocusBattle);
    }
  }

  for (const battle of Battle.list()) {
    if (!battles.has(battle)) {
      battle.close();
    }
  }

  trace();
}

function selectFocusBattle(battles) {
  let focusBattle;

  for (const battle of battles) {
    if (!focusBattle || (battle.zone.tier.level < focusBattle.zone.tier.level)) {
      focusBattle = battle;
    }
  }

  return focusBattle;
}
