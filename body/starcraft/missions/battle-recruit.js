import Mission from "../mission.js";
import Fight from "../jobs/fight.js";
import Zone from "../map/zone.js";

const RECRUIT_BALANCE = 2;
const DOWNSIZE_BALANCE = 4;

export default class BattleRecruitMission extends Mission {

  run() {
    for (const zone of Zone.list()) {
      const battle = zone.battle;

      if (battle && battle.frontline) {
        if (battle.balance < RECRUIT_BALANCE) {
          const frontline = battle.frontline;

          if (frontline.groundToGround.size) {
            openJob(battle, "Immortal");
            openJob(battle, "Zealot");
            openJob(battle, "Stalker");
            openJob(battle, "Sentry");
          } else if (frontline.groundToAir.size) {
            openJob(battle, "Stalker");
            openJob(battle, "Sentry");
            closeJobs(battle, "Immortal");
            closeJobs(battle, "Zealot");
          }

        } else if (battle.balance > DOWNSIZE_BALANCE) {
          // Downsize is not implemented
        }
      }
    }
  }

}

function openJob(battle, warrior) {
  const job = battle.fighters.find(job => (!job.assignee && job.agent && (job.agent.type.name === warrior)));

  if (!job) {
    new Fight(battle, warrior);
  }
}

function closeJobs(battle, warrior) {
  for (const job of battle.fighters) {
    if (job.agent && (job.agent.type === warrior)) {
      job.close(true);
    }
  }
}
