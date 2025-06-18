import { Memory, ActiveCount } from "./imports.js";

export default function() {
  const previousFlag = Memory.FlagSiegeDefense;
  let flag = isArmyEnough();

  if (flag != previousFlag) {
    console.log(flag ? "Raise" : "Lower", "Flag Siege Defense");
    Memory.FlagSiegeDefense = flag;
  }
}

function isArmyEnough() {
  if (!ActiveCount.Gateway) return false;
  if (!ActiveCount.CyberneticsCore) return false;
  if (ActiveCount.Immortal + ActiveCount.Sentry + ActiveCount.Stalker + ActiveCount.Zealot < 16) return false;

  return true;
}
