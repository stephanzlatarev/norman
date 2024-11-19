import Fight from "../jobs/fight.js";
import { ActiveCount } from "../memo/count.js";

const RECRUIT_BALANCE = 2;
const ALL_WARRIORS = ["Colossus", "Immortal", "Sentry", "Stalker", "Zealot"];
const GROUND_HITTING_WARRIORS = ["Colossus", "Immortal", "Zealot"];

export default function(battle, isFocusBattle) {
  if (battle.lines.length) {

    if (isFocusBattle || (battle.recruitedBalance < RECRUIT_BALANCE)) {

      closeOpenJobsOutsideBattleLines(battle);

      if (isSmallBattle(battle)) {
        // Make sure we don't overreact to individual enemy units in our territory
        if (isFocusBattle || (battle.fighters.length < 3)) openJobs(battle, "Stalker", "Zealot");

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

  } else {
    closeJobs(battle, ...ALL_WARRIORS);
  }
}

function isAirBattle(battle) {
  for (const zone of battle.zones) {
    for (const threat of zone.threats) {
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

  for (const zone of battle.zones) {
    for (const threat of zone.threats) {
      if (threat.type.damageGround) count++;
      if (count > 2) return true;
    }
  }

  return false;
}

function isJobOpen(job) {
  return !job.assignee || !job.assignee.isAlive;
}

function openJobs(battle, ...warriors) {
  for (const warrior of warriors) {
    if (ActiveCount[warrior]) {
      for (const line of battle.lines) {
        openJob(battle, line, warrior);
      }
    }
  }
}

function openJob(battle, line, warrior) {
  if (!battle.fighters.find(job => (isJobOpen(job) && job.agent && (job.agent.type.name === warrior) && (job.zone === line.zone)))) {
    new Fight(battle, warrior, line.zone.cell);
  }
}

function closeOpenJobs(battle, ...warriors) {
  for (const job of battle.fighters) {
    if (isJobOpen(job) && job.agent && (warriors.indexOf(job.agent.type.name) >= 0)) {
      job.close(true);
    }
  }
}

function closeOpenJobsOutsideBattleLines(battle) {
  let zones;

  for (const job of battle.fighters) {
    if (!isJobOpen(job)) continue;

    if (!zones) {
      zones = new Set(battle.lines.map(line => line.zone));
    }

    if (!zones.has(job.zone)) {
      job.close(true);
    }
  }
}

function closeJobs(battle, ...warriors) {
  for (const job of battle.fighters) {
    if (job.agent && (warriors.indexOf(job.agent.type.name) >= 0)) {
      job.close(true);
    }
  }
}
