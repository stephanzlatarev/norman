import { Memory, ActiveCount, Score } from "./imports.js";

export default function() {
  const previousFlag = Memory.FlagSiegeDefense;
  let flag = isSiegeDefenseEnough();

  if (flag != previousFlag) {
    console.log(flag ? "Raise" : "Lower", "Flag Siege Defense");
    Memory.FlagSiegeDefense = flag;
  }
}

function isSiegeDefenseEnough() {
  if (!ActiveCount.Gateway) return false;
  if (!ActiveCount.CyberneticsCore) return false;
  if (!ActiveCount.ShieldBattery) return false;

  if (Memory.LevelEnemyArmySuperiority < 2) {
    if (Score.currentValueArmy < 3000) return false;
  } else {
    if (Score.currentValueArmy < 5000) return false;
  }

  return true;
}
