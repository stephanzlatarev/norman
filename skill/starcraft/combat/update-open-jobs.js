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

export function updateOpenFightJobs(battle) {
  const shouldHire = (battle.recruitedBalance < MIN_RECRUIT_BALANCE) || (battle.fighters.length < MIN_FIGHTERS);
  const shouldFire = !shouldHire && (battle.recruitedBalance > MAX_RECRUIT_BALANCE);

  updateOpenJobs(battle, shouldHire, shouldFire);
}

export function updateOpenCleanupJobs(battle) {
  const shouldHire = (battle.fighters.length < MIN_FIGHTERS);
  const shouldFire = (battle.fighters.length > MIN_FIGHTERS);

  updateOpenJobs(battle, shouldHire, shouldFire);
}

function updateOpenJobs(battle, shouldHire, shouldFire) {
  closeOpenJobsOutsideBattle(battle);

  if (battle.isFocusBattle || shouldHire) {
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
  } else if (shouldFire) {
    // Reduce jobs
    closeOpenJobs(battle, ...ALL_WARRIORS);
    if (battle.isAirBattle) closeJobs(battle, ...GROUND_HITTING_WARRIORS);
    reduceJobs(battle, MIN_FIGHTERS);
  } else {
    // Stop hiring
    closeOpenJobs(battle, ...ALL_WARRIORS);
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
