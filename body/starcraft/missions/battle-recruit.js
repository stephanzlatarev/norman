import Mission from "../mission.js";
import Fight from "../jobs/fight.js";
import Zone from "../map/zone.js";
import { ActiveCount } from "../memo/count.js";

const RECRUIT_BALANCE = 2;
const DOWNSIZE_BALANCE = 4;

export default class BattleRecruitMission extends Mission {

  run() {
    let focus;

    for (const zone of Zone.list()) {
      if (zone.battle && (zone.threats.size > 1) && (!focus || (zone.tier.level < focus.tier.level))) focus = zone;
    }

    for (const zone of Zone.list()) {
      if (!zone.battle) continue;

      const battle = zone.battle;
      const stations = battle.stations;

      if (stations.length) {
        if ((zone === focus) || (battle.recruitedBalance < RECRUIT_BALANCE)) {
          const include = ["Stalker"];
          const exclude = [];

          // Make sure we don't overreact to a single enemy unit in our territory
          if (zone.threats.size > 1) {
            include.push("Sentry");
          }

          // Make sure ground-hitting units are included only when there are ground enemy units
          if (isAirBattle(battle)) {
            exclude.push("Colossus", "Immortal", "Zealot");
          } else {
            include.push("Colossus", "Immortal", "Zealot");
          }

          for (const warrior of include) for (const station of stations) openJob(battle, warrior, station);
          for (const warrior of exclude) closeJobs(battle, warrior);
        } else if (battle.recruitedBalance > DOWNSIZE_BALANCE) {
          // Downsize is not implemented
        }
      }
    }
  }

}

function isAirBattle(battle) {
  for (const threat of battle.zone.threats) {
    if (threat.body.isGround) {
      // There's at least this one ground enemy unit, so the battle is not only in the air
      return false;
    }
  }

  return true;
}

function openJob(battle, warrior, station) {
  if (!ActiveCount[warrior]) return;

  if (!battle.fighters.find(job => (!job.assignee && job.agent && (job.agent.type.name === warrior) && (job.station === station)))) {
    new Fight(battle, warrior, station);
  }
}

function closeJobs(battle, warrior) {
  for (const job of battle.fighters) {
    if (job.agent && (job.agent.type.name === warrior)) {
      job.close(true);
    }
  }
}
