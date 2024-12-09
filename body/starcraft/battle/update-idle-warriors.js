
const ALL_WARRIORS = ["Colossus", "Immortal", "Sentry", "Stalker", "Zealot"];
const GROUND_HITTING_WARRIORS = ["Colossus", "Immortal", "Zealot"];

export default function(battle) {
  if (battle.lines.length) {
    hireIdleWarriorsInBattleZone(battle, isAirBattle(battle));
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

function hireIdleWarriorsInBattleZone(battle, isAirBattle) {
  for (const zone of battle.zones) {
    for (const warrior of zone.warriors) {
      if (!warrior.isAlive) continue;
      if (warrior.job && (warrior.job.battle === battle)) continue;
      if (warrior.job && (warrior.job.priority >= battle.priority)) continue;
      if (isAirBattle && (GROUND_HITTING_WARRIORS.indexOf(warrior.type.name) >= 0)) continue;
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
