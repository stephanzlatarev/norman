import { ActiveCount, Battle, Memory, MemoryLabel } from "./imports.js";

const LEVELS = [

  // Start level
  {
    name: "DeploymentOutreachStarter", label: "Starter",
    triggers: [
      { condition: () => !Memory.MilestoneFirstMilitary, reason: "We don't have army yet" },
    ],
  },

  // Overwhelming enemy attack is imminent. Defend the largest defendable perimeter with all warriors behind walls. Abandon exposed outposts if necessary.
  {
    name: "DeploymentOutreachSiegeDefense", label: "Siege Defense",
    triggers: [
      { condition: () => (Memory.LevelEnemyRush >= 2), reason: "Early enemy rush is expected" },
    ],
  },

  // Station warriors in economy perimeter and watch approaches
  {
    name: "DeploymentOutreachNormalDefense", label: "Normal Defense",
    triggers: [
      // During heavy battles in our bases, focus on defense
      { condition: areFightingBattlesInOurBases, reason: "Fighting battles in our bases" },

      // When we don't have the army to defend an expansion, then don't start it
      { condition: () => (Memory.LevelEnemyArmySuperiority > 2), reason: "Army cannot defend new expansion" },
    ]
  },

  // Secure the next outpost with the intent to build a new base
  {
    name: "DeploymentOutreachExpandDefense", label: "Expand Defense",
    enablers: [
      // When we are attacked by zerglings but we have oracles ready, then secure the expansion. TODO: Add check that we're attacked by zerglings
      { condition: () => (ActiveCount.Oracle >= 2), reason: "Oracles ready to secure expansion against zerglings" },
    ],
    triggers: [
      // When we expect an enemy rush, then build defenses without expanding
      { condition: () => (Memory.LevelEnemyRush >= 1), reason: "Normal enemy rush is expected" },
    ],
  },

  // Test enemy lines for weaknesses and keep main army ready to return to defense
  {
    name: "DeploymentOutreachProbingAttack", label: "Probing Attack",
    blockers: [
      // When our army is weaker than the enemy, then focus on defense
      { condition: () => (Memory.LevelEnemyArmySuperiority > 1.5), reason: "Enemy army is much stronger than ours" },
    ],
  },

  // Create multi-pronged attacks on weakest enemy zones with the intent to build forces and upgrade technology
  {
    name: "DeploymentOutreachNormalOffense", label: "Normal Offense",
    blockers: [
      // When our army is weaker than the enemy, then focus on probing attacks
      { condition: () => (Memory.LevelEnemyArmySuperiority > 1), reason: "Enemy army is stronger than ours" },
    ],
  },

  // Create aggressive attacks with the intent to rotate forces into more powerful army composition
  {
    name: "DeploymentOutreachFullOffense", label: "Full Offense",
    enablers: [
      { condition: () => Memory.FlagMaxEnemy, reason: "Army is maxed out" },
    ],
    blockers: [
      { condition: () => !Memory.FlagMaxEnemy, reason: "Army is yet to max out" },
    ],
  },

];
const LEVELS_WITH_ENABLERS = LEVELS.filter(level => (level.enablers && level.enablers.length)).reverse();

function label(level, label) {
  return MemoryLabel("DeploymentOutreach", level, label);
}

// Set levels according to their position in the array
for (let level = 0; level < LEVELS.length; level++) {
  const one = LEVELS[level];

  one.level = level;
  Memory[one.name] = level;
  label(level, one.label);
}

// Start the game with siege defense
Memory.DeploymentOutreach = 0;
console.log(`Deployment outreach is set to ${label(Memory.DeploymentOutreach)}`);

export default function() {
  const { level, condition } = selectDeploymentOutreach()

  if (level !== Memory.DeploymentOutreach) {
    console.log(`Deployment outreach changes from ${label(Memory.DeploymentOutreach)} to ${label(level)}: ${condition}`);
    Memory.DeploymentOutreach = level;
  }
}

function getEnabledDeploymentOutreach() {
  for (const one of LEVELS_WITH_ENABLERS) {
    for (const enabler of one.enablers) {
      if (enabler.condition()) {
        return { level: one.level, condition: enabler.reason };
      }
    }
  }
}

function selectDeploymentOutreach() {
  const enabledOutreach = getEnabledDeploymentOutreach();
  const enabledOutreachLevel = enabledOutreach ? enabledOutreach.level : 0;

  for (let level = enabledOutreachLevel; level < LEVELS.length; level++) {
    const one = LEVELS[level];

    if (one.blockers) {
      for (const blocker of one.blockers) {
        if (blocker.condition()) {
          return { level: one.level - 1, condition: blocker.reason };
        }
      }
    }

    if (one.triggers) {
      for (const trigger of one.triggers) {
        if (trigger.condition()) {
          return { level: one.level, condition: trigger.reason };
        }
      }
    }
  }

  return enabledOutreach || { level: Memory.DeploymentOutreachFullOffense, condition: "All in" };
}

function areFightingBattlesInOurBases() {
  for (const battle of Battle.list()) {
    if (battle.front.depot && battle.front.depot.isActive && (battle.front.enemies.size >= 5)) {
      return true;
    }
  }
}
