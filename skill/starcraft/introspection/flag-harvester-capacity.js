import { ActiveCount, Depot, Job, Memory, Types } from "./imports.js";

let TIME_TO_BUILD_NEXUS;
let TIME_TO_BUILD_PROBE;

export default function() {
  if (!ActiveCount.Nexus) return;
  if (!TIME_TO_BUILD_NEXUS) TIME_TO_BUILD_NEXUS = Types.unit("Nexus").buildTime;
  if (!TIME_TO_BUILD_PROBE) TIME_TO_BUILD_PROBE = Types.unit("Probe").buildTime;

  const previousFlag = Memory.FlagHarvesterCapacity;
  const currentFlag = isReachingHarvesterCapacity();

  if (currentFlag != previousFlag) {
    console.log(currentFlag ? "Raise" : "Lower", "Flag Harvester Capacity");

    Memory.FlagHarvesterCapacity = currentFlag;
  }
}

// TODO: Improve by considering gas harvesters too
function isReachingHarvesterCapacity() {
  const mineralHarvesterCapacity = calculateMineralHarvesterCapacity();

  const timeForProbeToReachConstructionSite = 5 * 22.4; // Assume 5 seconds
  const timeToIncreaseHarvesterCapacity = timeForProbeToReachConstructionSite + TIME_TO_BUILD_NEXUS;

  const freeCapacity = mineralHarvesterCapacity - countMineralHarvesters();
  const timeToReachHarvesterCapacity = TIME_TO_BUILD_PROBE * Math.floor(freeCapacity / ActiveCount.Nexus);

  return (timeToReachHarvesterCapacity <= timeToIncreaseHarvesterCapacity);
}

function calculateMineralHarvesterCapacity() {
  let capacity = 0;

  for (const zone of Depot.list()) {
    if (!zone.depot) continue;

    if (zone.minerals.size === 8) {
      capacity += 20;
    } else {
      capacity += zone.minerals.size * 2;
    }
  }

  return capacity;
}

function countMineralHarvesters() {
  let count = 0;

  for (const job of Job.list()) {
    if (job.assignee && job.isHarvestMineralsJob) count++;
  }

  return count;
}
