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

  if (Score.currentValueArmy < 3000) return false;
  if ((Score.currentValueArmy < 5000) && (ActiveCount.Nexus === 1) && (Memory.LevelEnemyArmySuperiority > 2)) return false;

  return true;
}
