import Mission from "../mission.js";
import Fight from "../jobs/fight.js";
import { ALERT_WHITE } from "../map/alert.js";
import Zone from "../map/zone.js";

const RECRUIT_BALANCE = 2;
const DOWNSIZE_BALANCE = 4;

export default class BattleRecruitMission extends Mission {

  run() {
    for (const zone of Zone.list()) {
      if (!zone.battle) continue;

      const battle = zone.battle;

      if (battle.recruitedBalance < RECRUIT_BALANCE) {
        const rallyZones = getRallyZones(battle);

        if (isAirBattle(battle)) {
          closeJobs(battle, "Immortal");
          closeJobs(battle, "Zealot");
        } else {
          for (const rally of rallyZones) {
            openJob(battle, "Immortal", rally);
            openJob(battle, "Zealot", rally);
          }
        }

        for (const rally of rallyZones) {
          openJob(battle, "Stalker", rally);
          openJob(battle, "Sentry", rally);
        }
      } else if (battle.recruitedBalance > DOWNSIZE_BALANCE) {
        // Downsize is not implemented
      }
    }
  }

}

function isAirBattle(battle) {
  for (const threat of battle.zone.threats) {
    if (threat.type.damageGround && threat.body.isGround) {
      // At least one ground enemy unit can attack our ground warriors, so this is not an air battle
      return false;
    }
  }

  return true;
}

function getRallyZones(battle) {
  const zones = [];

  for (const corridor of battle.zone.corridors) {
    for (const neighbor of corridor.zones) {
      if ((neighbor !== battle.zone) && (neighbor.alertLevel <= ALERT_WHITE)) {
        zones.push(neighbor);
      }
    }
  }

  return zones;
}

function openJob(battle, warrior, rally) {
  if (!battle.fighters.find(job => (!job.assignee && job.agent && (job.agent.type.name === warrior) && (job.zone === rally)))) {
    new Fight(battle, warrior, rally);
  }
}

function closeJobs(battle, warrior) {
  for (const job of battle.fighters) {
    if (job.agent && (job.agent.type.name === warrior)) {
      job.close(true);
    }
  }
}
