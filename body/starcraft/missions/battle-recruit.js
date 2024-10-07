import Mission from "../mission.js";
import Battle from "../battle/battle.js";
import Fight from "../jobs/fight.js";
import { ActiveCount } from "../memo/count.js";

const RECRUIT_BALANCE = 2;
const ALL_WARRIORS = ["Colossus", "Immortal", "Sentry", "Stalker", "Zealot"];
const GROUND_HITTING_WARRIORS = ["Colossus", "Immortal", "Zealot"];

export default class BattleRecruitMission extends Mission {

  run() {
    let focus;

    for (const battle of Battle.list()) {
      if (!battle.stations.length) continue;

      if (!focus || (battle.zone.tier.level < focus.zone.tier.level)) focus = battle;
    }

    for (const battle of Battle.list()) {
      if (battle.stations.length) {
        const isAir = isAirBattle(battle);
        const isSmall = isSmallBattle(battle);

        maintainOpenFightJobs(battle, focus, isAir, isSmall);
        hireIdleWarriorsInBattleZone(battle, isAir);
        maintainPriorityOfFightJobs(battle);
      } else {
        closeJobs(battle, ...ALL_WARRIORS);
      }
    }
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

function hireIdleWarriorsInBattleZone(battle, isAirBattle) {
  for (const zone of battle.hotspot.zones) {
    for (const warrior of zone.warriors) {
      if (!warrior.isAlive) continue;
      if (warrior.job && (warrior.job.battle === battle)) continue;
      if (warrior.job && (warrior.job.priority >= battle.priority)) continue;
      if (isAirBattle && (GROUND_HITTING_WARRIORS.indexOf(warrior.type.name) >= 0)) continue;
      if (ALL_WARRIORS.indexOf(warrior.type.name) < 0) continue;

      const fighter = battle.fighters.find(job => (!job.assignee && job.agent && (job.agent.type.name === warrior.type.name)));

      if (fighter) {
        fighter.assign(warrior);
      }
    }
  }
}

function maintainPriorityOfFightJobs(battle) {
  for (const fighter of battle.fighters) {
    fighter.priority = battle.priority;
  }
}

function maintainOpenFightJobs(battle, focus, isAirBattle, isSmallBattle) {
  const isRecruitBalanceLow = (battle.recruitedBalance < RECRUIT_BALANCE);

  if (isRecruitBalanceLow || (battle === focus)) {
    const priority = isRecruitBalanceLow ? battle.priority : 0;

    closeOpenJobsForOldStations(battle);

    if (isSmallBattle) {
      // Make sure we don't overreact to individual enemy units in our territory
      if ((battle === focus) || (battle.fighters.length < 3)) openJobs(battle, priority, "Stalker", "Zealot");

      closeOpenJobs(battle, "Colossus", "Immortal", "Sentry");
    } else {
      openJobs(battle, priority, "Sentry", "Stalker");

      // Make sure ground-hitting units are included only when there are ground enemy units
      if (isAirBattle) {
        closeOpenJobs(battle, ...GROUND_HITTING_WARRIORS);
      } else {
        openJobs(battle, priority, ...GROUND_HITTING_WARRIORS);
      }
    }
  } else {
    closeOpenJobs(battle, ...ALL_WARRIORS);
  }
}

function openJobs(battle, priority, ...warriors) {
  for (const warrior of warriors) {
    if (ActiveCount[warrior]) {
      for (const station of battle.stations) {
        openJob(battle, warrior, station, priority);
      }
    }
  }
}

function openJob(battle, warrior, station, priority) {
  let fighter = battle.fighters.find(job => (!job.assignee && job.agent && (job.agent.type.name === warrior) && (job.station.zone === station.zone)));

  if (!fighter) {
    fighter = new Fight(battle, warrior, station);
  }
}

function closeOpenJobs(battle, ...warriors) {
  for (const job of battle.fighters) {
    if (!job.assignee && job.agent && (warriors.indexOf(job.agent.type.name) >= 0)) {
      job.close(true);
    }
  }
}

function closeOpenJobsForOldStations(battle) {
  for (const job of battle.fighters) {
    if (job.assignee) continue;

    if (!battle.stations.find(station => (station.zone === job.station.zone))) {
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
