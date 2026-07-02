
const ALL_WARRIORS = ["Colossus", "Immortal", "Sentry", "Stalker", "Zealot"];
const GROUND_HITTING_WARRIORS = ["Colossus", "Immortal", "Zealot"];

export default function(battle) {
  hireIdleWarriorsInBattleZone(battle);
}

function hireIdleWarriorsInBattleZone(battle) {
  for (const sector of battle.sectors) {
    for (const warrior of sector.warriors) {
      if (!warrior.isAlive) continue;
      if (warrior.job && (warrior.job.battle === battle)) continue;
      if (warrior.job && (warrior.job.priority >= battle.priority)) continue;
      if (battle.isAirBattle && (GROUND_HITTING_WARRIORS.indexOf(warrior.type.name) >= 0)) continue;
      if (ALL_WARRIORS.indexOf(warrior.type.name) < 0) continue;

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
