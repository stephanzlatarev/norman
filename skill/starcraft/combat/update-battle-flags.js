
const MAX_BATTLE_PRIORITY = 90;

const IS_STRONG_ENEMY = {
  Battlecruiser: true,
  Bunker: true,
  Immortal: true,
  ShieldBattery: true,
  SiegeTank: true,
  SiegeTankSieged: true,
};

export default function(battles) {
  if (battles.size > 1) {
    multipleBattles([...battles]);
  } else if (battles.size === 1) {
    singleBattle(battles);
  }
}

function singleBattle([battle]) {
  battle.priority = MAX_BATTLE_PRIORITY;
  battle.isAirBattle = false;
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
    battle.isOnlyBattle = false;
    battle.isSmallBattle = isSmallBattle(battle);
  }

  const focusBattle = selectFocusBattle(battles);
  for (const battle of battles) {
    battle.isFocusBattle = (battle === focusBattle);
  }
}

function selectFocusBattle(battles) {
  // The focus battle is the first large battle closest to our home base
  for (const battle of battles) {
    if (!battle.isSmallBattle) {
      return battle;
    }
  }

  // When all battles are small, the focus battle is the closest to our home base
  return battles[0];
}

function isAirBattle(battle) {
  for (const sector of battle.sectors) {
    for (const threat of sector.threats) {
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

  for (const sector of battle.sectors) {
    for (const threat of sector.threats) {
      if (threat.type.isWorker) continue;
      if (IS_STRONG_ENEMY[threat.type.name]) return false;
      if (threat.type.damageGround) count++;
      if (count > 2) return false;
    }
  }

  return true;
}
