import Battle from "../battle/battle.js";
import Resources from "../memo/resources.js";
import traceBattle from "./trace.js";

const ATTACK_BALANCE = 1.6;
const RETREAT_BALANCE = 1.0;
const DEFEND_BALANCE = 0.7;

export default function(battle) {
  if (!battle.lines.length) {
    battle.mode = Battle.MODE_WATCH;
    battle.range = Battle.RANGE_BACK;
  } else if ((Resources.supplyUsed > 190) && ((battle.deployedBalance >= ATTACK_BALANCE) || ((battle.mode === Battle.MODE_FIGHT) && (battle.deployedBalance >= RETREAT_BALANCE)) || areEnoughFightersRallied(battle))) {
    battle.mode = Battle.MODE_FIGHT;
    battle.range = Battle.RANGE_FRONT;
  } else if (battle.deployedBalance === Infinity) {
    battle.mode = Battle.MODE_SMASH;
    battle.range = Battle.RANGE_FRONT;
  } else if (isSmallFight(battle)) {
    battle.mode = Battle.MODE_SMASH;
    battle.range = Battle.RANGE_FRONT;
  } else {
    let shouldFight;

    if (battle.zone.tier.level === 1) {
      shouldFight = (battle.deployedBalance >= DEFEND_BALANCE) || areEnoughFightersRallied(battle);
    } else if (battle.zone.tier.level === 2) {
      shouldFight = (battle.deployedBalance >= DEFEND_BALANCE);
    } else if ((battle.mode === Battle.MODE_FIGHT) && (battle.deployedBalance >= RETREAT_BALANCE)) {
      shouldFight = true;
    } else {
      shouldFight = (battle.deployedBalance >= ATTACK_BALANCE);
    }

    if (shouldFight) {
      battle.mode = Battle.MODE_FIGHT;
      battle.range = Battle.RANGE_FRONT;
    } else {
      battle.mode = Battle.MODE_RALLY;
      battle.range = Battle.RANGE_BACK;
    }
  }

  if (battle.mode !== battle.pastmode) {
    traceBattle(battle, "mode: " + battle.pastmode + " > " + battle.mode);
    battle.pastmode = battle.mode;
  }
}

function areEnoughFightersRallied(battle) {
  let deployed = 0;
  let rallying = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive) {
      if (battle.zones.has(warrior.zone)) {
        deployed++;
      } else {
        rallying++;
      }
    }
  }

  return (deployed > rallying * 4);
}

function isSmallFight(battle) {
  let warriorCount = 0;
  let enemyCount = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive && battle.zones.has(warrior.zone)) {
      warriorCount++;
    }
  }

  for (const one of battle.zones) {
    for (const enemy of one.threats) {
      if (!enemy.type.isWorker && (enemy.type.damageGround > 0)) {
        enemyCount++;
      }
    }
  }

  return (enemyCount <= 3) && (warriorCount > enemyCount);
}
