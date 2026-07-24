import { ActiveCount } from "./imports.js";
import Battle from "./battle.js";
import Fight from "./job-fight.js";

const MIN_FIGHTERS = 3;
const MIN_RECRUIT_BALANCE = 2;
const MAX_RECRUIT_BALANCE = 4;

const ALL_WARRIORS = ["Colossus", "Immortal", "Sentry", "Stalker", "Zealot"];
const CLEANUP_WARRIORS = ["Stalker", "Zealot"];
const GROUND_HITTING_WARRIORS = ["Colossus", "Immortal", "Zealot"];

const NON_CLEANUP_WARRIORS = ALL_WARRIORS.filter(one => (CLEANUP_WARRIORS.indexOf(one) < 0));
const NON_GROUND_HITTING_WARRIORS = ALL_WARRIORS.filter(one => (GROUND_HITTING_WARRIORS.indexOf(one) < 0));

export default function() {
  let focusBattle;
  let isHiring = false;

  for (const battle of Battle.list()) {
    if (battle.isFocusBattle) focusBattle = battle;

    if (battle.isMissionBattle) {
      // This is a mission battle. Keep open jobs for minimum number of fighters
      battle.shouldHire = (battle.fighters.length < MIN_FIGHTERS);
      battle.shouldFire = (battle.fighters.length > MIN_FIGHTERS);
    } else {
      // This is a normal battles. Keep more open jobs
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
    }
  }

  // When not hiring elsewhere open jobs for the focus fire
  if (!isHiring && focusBattle) {
    focusBattle.shouldHire = true;
    focusBattle.shouldFire = false;
  }

  for (const battle of Battle.list()) {
    updateOpenJobs(battle, battle.shouldHire, battle.shouldFire);
  }
}

function updateOpenJobs(battle, shouldHire, shouldFire) {
  closeOutdatedJobs(battle);

  if (shouldHire) {
    // Open new jobs
    if (battle.isOnlyBattle) {
      // All warriors go to the only battle in case enemy is reinforced
      openJobs(battle, ...ALL_WARRIORS);
    } else if (battle.isSmallBattle && !battle.isFocusBattle) {
      // Only cleanup warriors go to the small battles
      openJobs(battle, ...CLEANUP_WARRIORS);
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
  } else {
    // Stop hiring
    closeOpenJobs(battle, ...ALL_WARRIORS);
  }

  if (shouldFire) {
    // Reduce jobs
    if (battle.isAirBattle) closeJobs(battle, ...GROUND_HITTING_WARRIORS);

    reduceJobs(battle, MIN_FIGHTERS);
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

function closeOutdatedJobs(battle) {
  for (const job of battle.fighters) {
    if (job.zone === battle.rally) continue;

    if (isJobOpen(job)) {
      job.close(true);
    } else {
      job.zone = battle.rally;
      job.station = job.zone.cell;
    }
  }
}

function reduceJobs(battle, limit) {
  for (let i = limit; i < battle.fighters.length; i++) {
    battle.fighters[i].close(true);
  }
}
