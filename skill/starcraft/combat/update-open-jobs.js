import { ActiveCount } from "./imports.js";
import Fight from "./job-fight.js";

const MIN_FIGHTERS = 3;
const MIN_RECRUIT_BALANCE = 2;
const MAX_RECRUIT_BALANCE = 4;

const ALL_WARRIORS = ["Colossus", "Immortal", "Sentry", "Stalker", "Zealot"];
const CLEANUP_WARRIORS = ["Stalker", "Zealot"];
const GROUND_HITTING_WARRIORS = ["Colossus", "Immortal", "Zealot"];

const NON_CLEANUP_WARRIORS = ALL_WARRIORS.filter(one => (CLEANUP_WARRIORS.indexOf(one) < 0));
const NON_GROUND_HITTING_WARRIORS = ALL_WARRIORS.filter(one => (GROUND_HITTING_WARRIORS.indexOf(one) < 0));

export function updateOpenFightJobs(battles) {
  const fronts = new Set();

  let focusBattle;
  let isHiring = false;

  for (const battle of battles) {
    if (battle.isFocusBattle) focusBattle = battle;

    if (isBattleBlocked(battle, fronts)) {
      closeAllJobs(battle);
      battle.shouldHire = false;
      battle.shouldFire = false;
      continue;
    }

    if ((battle.recruitedBalance < MIN_RECRUIT_BALANCE) || (battle.fighters.length < MIN_FIGHTERS)) {
      isHiring = true;
      battle.shouldHire = true;
      battle.shouldFire = false;
    } else if (battle.recruitedBalance > MAX_RECRUIT_BALANCE) {
      battle.shouldHire = false;
      battle.shouldFire = true;
    } else {
      battle.shouldHire = false;
      battle.shouldFire = false;
    }

    if (!battle.isAmbushBattle && !battle.isSmallBattle && !battle.isCleanupBattle) {
      fronts.add(battle.front);
    }
  }

  if (!isHiring && focusBattle) {
    focusBattle.shouldHire = true;
    focusBattle.shouldFire = false;
  }

  for (const battle of battles) {
    updateOpenJobs(battle, battle.shouldHire, battle.shouldFire);
  }
}

export function updateOpenCleanupJobs(battles) {
  for (const battle of battles) {
    const shouldHire = (battle.fighters.length < MIN_FIGHTERS);
    const shouldFire = (battle.fighters.length > MIN_FIGHTERS);

    updateOpenJobs(battle, shouldHire, shouldFire);
  }
}

function updateOpenJobs(battle, shouldHire, shouldFire) {
  closeOpenJobsOutsideBattle(battle);

  if (shouldHire) {
    // Open new jobs
    if (battle.isOnlyBattle) {
      // All warriors go to the only battle in case enemy is reinforced
      openJobs(battle, ...ALL_WARRIORS);
    } else if (battle.isSmallBattle) {
      // Make sure we don't overreact to individual enemy units in our territory
      if (shouldHire) {
        openJobs(battle, ...CLEANUP_WARRIORS);
      }

      closeOpenJobs(battle, ...NON_CLEANUP_WARRIORS);
    } else {
      openJobs(battle, ...NON_GROUND_HITTING_WARRIORS);

      // Make sure ground-hitting units are included only when there are ground enemy units
      if (battle.isAirBattle) {
        closeOpenJobs(battle, ...GROUND_HITTING_WARRIORS);
      } else {
        openJobs(battle, ...GROUND_HITTING_WARRIORS);
      }
    }
  }

  if (!shouldHire) {
    // Stop hiring
    closeOpenJobs(battle, ...ALL_WARRIORS);
  }

  if (shouldFire) {
    // Reduce jobs
    if (battle.isAirBattle) closeJobs(battle, ...GROUND_HITTING_WARRIORS);

    reduceJobs(battle, MIN_FIGHTERS);
  }
}

function isBattleBlocked(battle, fronts) {
  for (const zone of battle.front.route) {
    if (zone === battle.front) continue;
    if (fronts.has(zone)) return true;
  }
}

function isJobOpen(job) {
  return !job.assignee || !job.assignee.isAlive;
}

function openJobs(battle, ...warriors) {
  for (const warrior of warriors) {
    if (ActiveCount[warrior]) {
      openJob(battle, warrior);
    }
  }
}

function openJob(battle, warrior) {
  if (!battle.fighters.find(job => (isJobOpen(job) && job.agent && (job.agent.type.name === warrior) && (job.zone === battle.rally)))) {
    new Fight(battle, warrior, battle.rally.cell);
  }
}

function closeJobs(battle, ...warriors) {
  for (const job of battle.fighters) {
    if (job.agent && (warriors.indexOf(job.agent.type.name) >= 0)) {
      job.close(true);
    }
  }
}

function closeAllJobs(battle) {
  for (const job of battle.fighters) {
    job.close(true);
  }
}

function closeOpenJobs(battle, ...warriors) {
  for (const job of battle.fighters) {
    if (isJobOpen(job) && job.agent && (warriors.indexOf(job.agent.type.name) >= 0)) {
      job.close(true);
    }
  }
}

function closeOpenJobsOutsideBattle(battle) {
  for (const job of battle.fighters) {
    if (!isJobOpen(job)) continue;

    if (job.zone !== battle.rally) {
      job.close(true);
    }
  }
}

function reduceJobs(battle, limit) {
  for (let i = limit; i < battle.fighters.length; i++) {
    battle.fighters[i].close(true);
  }
}
