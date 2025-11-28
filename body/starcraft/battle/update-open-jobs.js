import Fight from "../jobs/fight.js";
import { ActiveCount } from "../memo/count.js";

const RECRUIT_BALANCE = 2;
const ALL_WARRIORS = ["Colossus", "Immortal", "Sentry", "Stalker", "Zealot"];
const GROUND_HITTING_WARRIORS = ["Colossus", "Immortal", "Zealot"];

export default function(battle, isFocusBattle, isOnlyBattle) {
  const isBalanceInsufficient = (battle.recruitedBalance < RECRUIT_BALANCE);

  if (isFocusBattle || isBalanceInsufficient) {

    closeOpenJobsOutsideBattle(battle);

    if (isOnlyBattle) {
      // All warriors go to the only battle in case enemy is reinforced
      openJobs(battle, ...ALL_WARRIORS);
    } else if (isSmallBattle(battle)) {
      // Make sure we don't overreact to individual enemy units in our territory
      if (isBalanceInsufficient || (battle.fighters.length < 3)) {
        openJobs(battle, "Stalker", "Zealot");
      }

      closeOpenJobs(battle, "Colossus", "Immortal", "Sentry");
    } else {
      openJobs(battle, "Sentry", "Stalker");

      // Make sure ground-hitting units are included only when there are ground enemy units
      if (isAirBattle(battle)) {
        closeOpenJobs(battle, ...GROUND_HITTING_WARRIORS);
      } else {
        openJobs(battle, ...GROUND_HITTING_WARRIORS);
      }
    }
  } else {
    closeOpenJobs(battle, ...ALL_WARRIORS);
  }
}

function isAirBattle(battle) {
  for (const sector of battle.sectors) {
    for (const threat of sector.threats) {
      if (threat.body.isGround) {
        // There's at least this one ground enemy unit, so the battle is not only in the air
        return false;
      }
    }
  }

  return true;
}

function isSmallBattle(battle) {
  let count = 0;

  for (const sector of battle.sectors) {
    for (const threat of sector.threats) {
      if (threat.type.damageGround) count++;
      if (count > 2) return false;
    }
  }

  return true;
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
  if (!battle.fighters.find(job => (isJobOpen(job) && job.agent && (job.agent.type.name === warrior) && (job.zone === battle.front)))) {
    new Fight(battle, warrior, battle.front.cell);
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

    if (job.zone === battle.rally) {
      job.close(true);
    }
  }
}
