
export default function(battles) {
  if (battles.length > 1) {
    multipleBattles(battles);
  } else if (battles.length === 1) {
    singleBattle(battles[0]);
  }
}

function singleBattle(battle) {
  battle.isOnlyBattle = true;
  battle.isFocusBattle = true;
}

function multipleBattles(battles) {
  const focusBattle = selectFocusBattle(battles);

  for (const battle of battles) {
    battle.isOnlyBattle = false;
    battle.isFocusBattle = (battle === focusBattle);
  }
}

// The focus battle is the one closest to our home base excluding smaller battles
function selectFocusBattle(battles) {
  let focusBattle;

  for (const battle of battles) {
    if (!focusBattle || (battle.front.perimeterLevel < focusBattle.front.perimeterLevel)) {
      focusBattle = battle;
    }
  }

  return focusBattle;
}
