import { ActiveCount, Memory } from "./imports.js";

const LEVELS = [

  // 0 - Not a valid outreach level
  { name: "DeploymentOutreachNone" },

  // 1 - Overwhelming enemy attack is imminent. Defend the largest defendable perimeter with all warriors behind walls. Abandon exposed outposts if necessary.
  {
    name: "DeploymentOutreachSiegeDefense",
    triggers: [
      { condition: () => (Memory.LevelEnemyRush >= 2), reason: "Early enemy rush is expected" },
    ],
  },

  // 2 - Station warriors in economy perimeter and watch approaches
  {
    name: "DeploymentOutreachNormalDefense",
    triggers: [
      // When we don't have the army to defend an expansion, then don't start it
      { condition: () => (Memory.LevelEnemyArmySuperiority > 2), reason: "Army cannot defend new expansion" },
    ]
  },

  // 3 - Secure the next outpost with the intent to build a new base
  {
    name: "DeploymentOutreachExpandDefense",
    enablers: [
      // When we are attacked by zerglings but we have oracles ready, then secure the expansion. TODO: Add check that we're attacked by zerglings
      { condition: () => (ActiveCount.Oracle >= 2), reason: "Oracles ready to secure expansion against zerglings" },
    ],
    blockers: [
      // When we expect an enemy rush, then build defenses without expanding
      { condition: () => (Memory.LevelEnemyRush > 0), reason: "Normal enemy rush is expected" },
    ],
  },

  // 4 - Test enemy lines for weaknesses and keep main army ready to return to defense
  {
    name: "DeploymentOutreachProbingAttack",
    blockers: [
      // When our army is weaker than the enemy, then focus on defense
      { condition: () => (Memory.LevelEnemyArmySuperiority > 1.5), reason: "Enemy army is stronger than ours" },
    ],
  },

  // 5 - Create multi-pronged attacks on weakest enemy zones with the intent to build forces and upgrade technology
  {
    name: "DeploymentOutreachNormalOffense",
    blockers: [
      // When our army is weaker than the enemy, then focus on probing attacks
      { condition: () => (Memory.LevelEnemyArmySuperiority > 1), reason: "Enemy army is stronger than ours" },
    ],
  },

  // 6 - Create aggressive attacks with the intent to rotate forces into more powerful army composition
  {
    name: "DeploymentOutreachFullOffense",
    enablers: [
      { condition: () => Memory.MilestoneMaxArmy, reason: "Army is maxed out" },
    ],
    blockers: [
      { condition: () => !Memory.MilestoneMaxArmy, reason: "Army is yet to max out" },
    ],
  },

];
const LEVELS_WITH_ENABLERS = LEVELS.filter(level => (level.enablers && level.enablers.length)).reverse();

// Set levels according to their position in the array
for (let level = 0; level < LEVELS.length; level++) {
  const one = LEVELS[level];

  one.level = level;
  Memory[one.name] = level;
}

const LABELS = LEVELS.map(level => level.name);

// Start the game with siege defense
Memory.DeploymentOutreach = Memory.DeploymentOutreachSiegeDefense;
console.log(`Deployment outreach is set to ${LABELS[Memory.DeploymentOutreach]} (${Memory.DeploymentOutreach})`);

export default function() {
  const { level, condition } = selectDeploymentOutreach()

  if (level !== Memory.DeploymentOutreach) {
    console.log(`Deployment outreach changes from ${LABELS[Memory.DeploymentOutreach]} (${Memory.DeploymentOutreach}) to ${LABELS[level]} (${level}): ${condition}`);
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

  for (let level = enabledOutreachLevel + 1; level < LEVELS.length; level++) {
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
