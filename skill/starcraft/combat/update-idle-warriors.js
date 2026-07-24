import Battle from "./battle.js";

const IS_WARRIOR = {
  Colossus: true,
  Immortal: true,
  Sentry: true,
  Stalker: true,
  Zealot: true,
};

const IS_GROUND_ONLY_WARRIOR = {
  Colossus: true,
  Immortal: true,
  Zealot: true,
};

export default function() {
  for (const battle of Battle.list()) {
    hireIdleWarriorsInBattleZone(battle);
  }
}

function hireIdleWarriorsInBattleZone(battle) {
  for (const sector of battle.sectors) {
    for (const warrior of sector.warriors) {
      if (!warrior.isAlive) continue;
      if (!IS_WARRIOR[warrior.type.name]) continue;
      if (warrior.job && (warrior.job.battle === battle)) continue;
      if (warrior.job && (warrior.job.priority >= battle.priority)) continue;
      if (battle.isAirBattle && IS_GROUND_ONLY_WARRIOR[warrior.type.name]) continue;

      const openJob = findOpenJob(battle, warrior);

      if (openJob) {
        openJob.assign(warrior);
      }
    }
  }
}

function findOpenJob(battle, warrior) {
  return battle.fighters.find(job => (!job.assignee && job.agent && (job.agent.type.name === warrior.type.name)));
}
