import { Memory, Job, ActiveCount, TotalCount, Resources } from "./imports.js";

export default function() {
  if (isSupplyBlocked()) {
    if (!Memory.FlagSupplyBlocked) console.log("Flag Supply Blocked");

    Memory.FlagSupplyBlocked = true;
  } else {
    Memory.FlagSupplyBlocked = false;
  }
}

function isSupplyBlocked() {
  if (Resources.supply >= 4) return false;
  if (TotalCount.Pylon > ActiveCount.Pylon) return false;

  for (const job of Job.list()) {
    if (job.output && job.output.name && (job.output.name === "Pylon")) return false;
  }

  return true;
}
