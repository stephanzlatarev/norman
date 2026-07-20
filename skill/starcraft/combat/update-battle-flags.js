
const MAX_BATTLE_PRIORITY = 90;

const IS_AMBUSH_ENEMY = {
  Bunker: true,
  PhotonCannon: true,
  ShieldBattery: true,
};

const IS_STRONG_ENEMY = {
  Battlecruiser: true,
  Bunker: true,
  Immortal: true,
  ShieldBattery: true,
  SiegeTank: true,
  SiegeTankSieged: true,
};

export default function(battles) {
  if (battles.length > 1) {
    multipleBattles(battles);
  } else if (battles.length === 1) {
    singleBattle(battles[0]);
  }
}

function singleBattle(battle) {
  battle.priority = MAX_BATTLE_PRIORITY;
  battle.isAirBattle = false;
  battle.isAmbushBattle = isAmbushBattle(battle);
  battle.isFocusBattle = true;
  battle.isOnlyBattle = true;
  battle.isSmallBattle = isSmallBattle(battle);
}

function multipleBattles(battles) {
  battles.sort((a, b) => (a.front.perimeterLevel - b.front.perimeterLevel));

  let priority = MAX_BATTLE_PRIORITY;

  for (const battle of battles) {
    battle.priority = priority--;
    battle.isAirBattle = isAirBattle(battle);
    battle.isAmbushBattle = isAmbushBattle(battle);
    battle.isOnlyBattle = false;
    battle.isSmallBattle = isSmallBattle(battle);
  }

  const focusBattle = selectFocusBattle(battles);
  for (const battle of battles) {
    battle.isFocusBattle = (battle === focusBattle);
  }
}

function selectFocusBattle(battles) {
  // Prefer a large (not ambush, small, or cleanup) battle close to our home base
  for (const battle of battles) {
    if (!battle.isAmbushBattle && !battle.isSmallBattle && !battle.isCleanupBattle) {
      return battle;
    }
  }

  // When all battles are ambush, small, or cleanup, focus on the battle that is closest to the enemy
  return battles[battles.length - 1];
}

function isAmbushBattle(battle) {
  for (const sector of battle.front.sectors) {
    for (const threat of sector.threats) {
      if (IS_AMBUSH_ENEMY[threat.type.name]) return true;
    }
  }

  return false;
}

function isAirBattle(battle) {
  let hasAirThreats = false;

  for (const sector of battle.sectors) {
    for (const threat of sector.threats) {
      if (threat.body.isGround) {
        // There's at least this one ground enemy unit, so the battle is not only in the air
        return false;
      } else {
        hasAirThreats = true;
      }
    }
  }

  return hasAirThreats;
}

function isSmallBattle(battle) {
  if (battle.isCleanupBattle) return true;

  let count = 0;

  for (const sector of battle.sectors) {
    for (const threat of sector.threats) {
      if (threat.type.isWorker) continue;
      if (IS_STRONG_ENEMY[threat.type.name]) return false;
      if (threat.type.damageGround) count++;
      if (count > 3) return false;
    }
  }

  return true;
}
