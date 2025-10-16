import Memory from "../../../code/memory.js";
import Mission from "../mission.js";
import Job from "../job.js";
import Types from "../types.js";
import Depot from "../map/depot.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";
import Limit from "../memo/limit.js";
import Priority from "../memo/priority.js";
import Resources from "../memo/resources.js";

let plan = doStartUp;

export default class PlanInvestmentsMission extends Mission {

  run() {
    plan();
  }

}

function doStartUp() {
  Limit.Assimilator = calculateLimitAssimilator();
  Limit.CyberneticsCore = 1;
  Limit.Forge = 0;
  Limit.Gateway = 2;
  Limit.Nexus = TotalCount.CyberneticsCore ? 2 : 1;
  Limit.ShieldBattery = 0;
  Limit.RoboticsFacility = 0;
  Limit.TwilightCouncil = 0;
  Limit.Sentry = 0;
  Limit.Stalker = (TotalCount.Nexus > 1) ? 1 : 0;
  Limit.Zealot = TotalCount.CyberneticsCore ? 1 : 0;

  Priority.Assimilator = 90;
  Priority.CyberneticsCore = 80;
  Priority.Gateway = 70;
  Priority.Nexus = 50;
  Priority.Stalker = 50;
  Priority.Zealot = 50;

  if (Memory.LimitBase === 1) {
    plan = doOneBaseDefense;
    console.log("Transition to one base defense.");
  } else if (TotalCount.Stalker) {
    plan = doGroundArmyMaxOut;
    console.log("Transition to maxing out with ground army.");
  }
}

function doOneBaseDefense() {
  Limit.Immortal = Infinity;
  Limit.Stalker = Infinity;
  Limit.Probe = (Memory.LevelEnemyRush >= 2) ? 23 : 26;
  Limit.Observer = 1;
  Limit.Sentry = 2;
  Limit.DarkTemplar = 0;

  Limit.Nexus = 1;
  Limit.Assimilator = calculateLimitAssimilator();
  Limit.Gateway = TotalCount.Assimilator ? TotalCount.Stalker ? 3 : 2 : 1;
  Limit.CyberneticsCore = 1;
  Limit.RoboticsFacility = (ActiveCount.Stalker >= 3) ? 1 : 0;
  Limit.Forge = 0;
  Limit.TwilightCouncil = 0;

  Priority.CyberneticsCore = 100;
  Priority.Observer = 100;
  Priority.Immortal = 95;
  Priority.Assimilator = 90;
  Priority.Gateway = 90;
  Priority.Sentry = (ActiveCount.Stalker > 2) ? 90 : 50;
  Priority.Stalker = (TotalCount.Stalker < 12) ? 80 : 60;
  Priority.Probe = 75;
  Priority.RoboticsFacility = (TotalCount.Stalker >= 6) ? 85 : 70;
  Priority.Nexus = 0;

  if (Memory.ModeCombatDefend) {
    Priority.ShieldBattery = 100;
    Limit.ShieldBattery = (TotalCount.Stalker + TotalCount.Zealot >= 1) ? 1 : 0;

    if (!TotalCount.ShieldBattery && ActiveCount.Assimilator) {
      Priority.Assimilator = 50;
      Limit.Assimilator = 1;
    }
  } else {
    Priority.ShieldBattery = 0;
    Limit.ShieldBattery = 0;
  }

  if (Memory.LevelEnemyRush >= 3) {
    Priority.Zealot = 95;
    Limit.Zealot = 2;

    if (ActiveCount.CyberneticsCore) {
      if ((TotalCount.Zealot >= 1) && !TotalCount.Sentry) {
        Priority.Sentry = 100;
      } else if (TotalCount.Zealot >= 2) {

        // If we have too much minerals and not enough gas, then build Zealots
        if ((Resources.minerals >= 225) && (Resources.vespene < 50)) {
          Limit.Zealot = TotalCount.Zealot + 1;
        } else {
          Priority.Stalker = 100;
        }
      }

      const activeWarriors = ActiveCount.Stalker + ActiveCount.Sentry + ActiveCount.Zealot;
      const totalWarriors = TotalCount.Stalker + TotalCount.Sentry + TotalCount.Zealot;
      const trainingWarriors = totalWarriors - activeWarriors;

      if (trainingWarriors >= ActiveCount.Gateway) {
        Limit.Gateway = 3;
      }
    }
  } else if (Memory.LevelEnemyRush) {
    Priority.Zealot = 95;
    Limit.Zealot = 1;
  } else {
    Priority.Zealot = 0;
    Limit.Zealot = 0;
  }

  if (Memory.ModeCombatDefend && Memory.FlagSiegeDefense) {
    if (Memory.OpportunityToUseOracle) {
      Priority.Colossus = 0;
      Priority.Immortal = 0;
      Priority.RoboticsFacility = 0;
      Priority.RoboticsBay = 0;
      Limit.Colossus = TotalCount.Colossus;
      Limit.Immortal = TotalCount.Immortal;
      Limit.RoboticsBay = TotalCount.RoboticsBay;
      Limit.RoboticsFacility = TotalCount.RoboticsFacility;

      Limit.Oracle = 3;
      Limit.Stargate = 1;

      if (TotalCount.Stalker >= 6) {
        Priority.Oracle = 100;
        Priority.Stargate = 100;
      } else {
        Priority.Oracle = 0;
        Priority.Stargate = 0;
      }
    } else {
      Priority.RoboticsFacility = 100;
      Priority.RoboticsBay = 100;
      Limit.Colossus = 5;
      Limit.RoboticsBay = 1;

      if (TotalCount.RoboticsBay && (TotalCount.Colossus < Limit.Colossus)) {
        Priority.Colossus = 95;
        Priority.Immortal = 0;
        Limit.Immortal = TotalCount.Immortal; // TODO: Fix build-warrior job to remove unassigned conflicting jobs with lower priority for the same facility type
      } else {
        Priority.Colossus = 0;
        Priority.Immortal = 95;
      }
    }
  } else {
    Priority.RoboticsBay = 0;
    Limit.Colossus = 0;
    Limit.RoboticsBay = 0;
  }

  if (Memory.LimitBase > 1) {
    plan = doGroundArmyMaxOut;
    console.log("Transition to maxing out with ground army.");
  }
}

function doGroundArmyMaxOut() {
  const probeLimit = 85;
  const useColossus = (ActiveCount.RoboticsBay > 0);

  Limit.Colossus = useColossus ? 100 : 0;
  Limit.Immortal = useColossus ? 0 : 100;
  Limit.Observer = (ActiveCount.Colossus + ActiveCount.Immortal < 2) ? 1 : 2;
  Limit.Sentry = 100;
  Limit.Stalker = 400; // Maintain 4:1 ratio of Stalker to Zealot and Stalker to Sentry
  Limit.Zealot = TotalCount.CyberneticsCore ? 100 : 0;
  Limit.DarkTemplar = ActiveCount.DarkShrine ? 5 : 0;

  Priority.Probe = 90;
  Priority.Observer = 80;
  Priority.DarkTemplar = 40;
  Priority.Colossus = 50;
  Priority.Immortal = 50;
  Priority.Sentry = 50;
  Priority.Stalker = 50;
  Priority.Zealot = 50;

  if (Resources.supplyLimit < 198) {
    Limit.Nexus = !TotalCount.RoboticsFacility ? 2 : calculateLimitNexus(probeLimit);
    Priority.Nexus = (TotalCount.Nexus < Limit.Nexus) ? 70 : 0;
  } else {
    Limit.Nexus = Infinity;
    Priority.Nexus = 40;
  }
  Limit.Probe = Math.min(TotalCount.Nexus * 20 + TotalCount.Assimilator * 3, probeLimit);
  Limit.Assimilator = calculateLimitAssimilator();

  Priority.Gateway = 50;
  Limit.Gateway = calculateLimitGateway();
  Limit.RoboticsFacility = (TotalCount.Nexus > 1) ? 1 : 0;

  if (Memory.ModeCombatDefend) {
    Priority.RoboticsBay = 100;
    Priority.ShieldBattery = 100;
    Limit.RoboticsBay = 1;
    Limit.ShieldBattery = (TotalCount.Stalker + TotalCount.Zealot >= 1) ? 1 : 0;
  } else {
    Priority.RoboticsBay = 0;
    Priority.ShieldBattery = 0;
    Limit.RoboticsBay = 0;
    Limit.ShieldBattery = 0;
  }

  if (TotalCount.Gateway < 3) {
    Limit.Forge = 0;
  } else if (!ActiveCount.Forge) {
    Limit.Forge = 1;
  } else {
    Limit.Forge = 2;
  }
  Priority.Forge = (TotalCount.Gateway >= 3) ? 80 : 30;

  Limit.CyberneticsCore = 1;
  Limit.TwilightCouncil = TotalCount.Forge ? 1 : 0;

  if (Memory.LimitBase === 1) {
    plan = doOneBaseDefense;
    console.log("Transition to one base defense.");
  } else if ((VisibleCount.Queen >= 5) && (VisibleCount.Warrior <= 5)) {
    plan = counterMassLightZerg;
    console.log("Transition to countering mass light zerg.");
  }
}

function counterMassLightZerg() {
  const probeLimit = 100;

  Limit.Zealot = TotalCount.CyberneticsCore ? 100 : 0;
  Limit.Colossus = 100;
  Limit.Sentry = 10; // Maintain 10:1 ratio of Zealot to Sentry
  Limit.Observer = ActiveCount.RoboticsBay ? 33 : 2; // Maintain 3:1 ratio of Colossus to Observer and build 2 Observers before Colossi can be built
  Limit.Immortal = 0;
  Limit.Stalker = 0;
  Limit.DarkTemplar = 0;

  Priority.Probe = 90;
  Priority.Observer = 90;
  Priority.Colossus = 90;
  Priority.Sentry = 50;
  Priority.Zealot = 50;

  if (Resources.supplyLimit < 198) {
    Limit.Nexus = !TotalCount.RoboticsFacility ? 2 : calculateLimitNexus(probeLimit);
    Priority.Nexus = (TotalCount.Nexus < Limit.Nexus) ? 70 : 0;
  } else {
    Limit.Nexus = Infinity;
    Priority.Nexus = 40;
  }
  Limit.Assimilator = calculateLimitAssimilator();
  Limit.Probe = Math.min(TotalCount.Nexus * 20 + TotalCount.Assimilator * 3, probeLimit);

  Priority.Gateway = 50;
  Limit.Gateway = calculateLimitGateway();
  Limit.CyberneticsCore = 1;
  Limit.RoboticsFacility = 1;
  Limit.Forge = 1;
  Limit.TwilightCouncil = 1;
  Limit.RoboticsBay = 1;
  Limit.ShieldBattery = 0;
}

// When time to reach harvester capacity is less than time to increase harvester capacity, then build a new nexus
// Time to increase harvester capacity = time for probe to reach construction site + nexus build time
// Time to reach harvester capacity = time to build probe * Math.floor( free capacity / number of active nexuses)
// TODO: Improve precision by calculating the remaining time of all building probes, and by calculating the time for a probe to move to the next expansion site
function calculateLimitNexus(probeLimit) {
  if (TotalCount.Nexus >= ActiveCount.Gateway) return TotalCount.Nexus;

  const mineralHarvesterCapacity = calculateMineralHarvesterCapacity();
  const vespeneHarvesterCapacity = calculateLimitAssimilator() * 3;
  if (mineralHarvesterCapacity + vespeneHarvesterCapacity >= probeLimit) return TotalCount.Nexus;

  const timeForProbeToReachConstructionSite = 5 * 22.4; // Assume 5 seconds
  const timeToBuildNexus = Types.unit("Nexus").buildTime;
  const timeToIncreaseHarvesterCapacity = timeForProbeToReachConstructionSite + timeToBuildNexus;

  const timeToBuildProbe = Types.unit("Probe").buildTime;
  const freeCapacity = mineralHarvesterCapacity - countMineralHarvesters();
  const timeToReachHarvesterCapacity = ActiveCount.Nexus ? timeToBuildProbe * Math.floor(freeCapacity / ActiveCount.Nexus) : Infinity;

  return (timeToReachHarvesterCapacity <= timeToIncreaseHarvesterCapacity) ? TotalCount.Nexus + 1 : TotalCount.Nexus;
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

function calculateLimitAssimilator() {
  if (!TotalCount.Gateway) return 0;

  if (!TotalCount.CyberneticsCore) {
    if (ActiveCount.Gateway) {
      return 1;
    } else {
      // Last 15 percent give 7 seconds. Cybernetics core is built in 36 seconds.
      // Assimilator is built in 21 seconds. Add a few more seconds for worker movement time.
      // It takes 22 seconds from miner assignment to collecting 50 gas.
      // We aim at starting the first assimilator in about 43 seconds before enough gas for a Stalker.
      return (getBuildProgressOfFirstGateway() > 0.80) ? 1 : 0;
    }
  }

  if (Memory.LevelEnemyRush >= 3) {
    // Expecting enemy rush on minerals-only economy
    return 1;
  }

  let limit = 0;

  for (const zone of Depot.list()) {
    if (!zone.depot || !zone.depot.isActive) continue;

    if (zone.extractors.size === 2) {
      limit += 2; // Count the existing two assimilators
    } else if (zone.extractors.size === 1) {
      limit++; // Count the existing one assimilator

      // Allow one more assimilator if minerals are saturated
      if (zone.workers.size >= zone.minerals.size * 2 + 3) limit++;
    } else {
      // Allow one more assimilator if minerals are saturated
      if (zone.workers.size >= zone.minerals.size * 2) limit++;
    }
  }

  return limit;
}

function getBuildProgressOfFirstGateway() {
  if (Depot.home) {
    for (const building of Depot.home.buildings.values()) {
      if (building.type.name === "Gateway") {
        return building.buildProgress;
      }
    }
  }

  return 0;
}

const MineralCostPerSecondProbe    =  50 / 12;
const MineralCostPerSecondNexus    =  MineralCostPerSecondProbe;
const MineralCostPerSecondSentry   =  50 / 23;
const MineralCostPerSecondStalker  = 125 / 30;
const MineralCostPerSecondZealot   = 100 / 27;
const MineralCostPerSecondGateway  = Math.max(MineralCostPerSecondSentry, MineralCostPerSecondStalker, MineralCostPerSecondZealot);
const MineralCostPerSecondImmortal = 275 / 39;
const MineralCostPerSecondRobo     =  MineralCostPerSecondImmortal;
const MineralCostPerSecondExpand   = 500 / 60; // 1 Nexus every 2 minutes and pylons all the time

// TODO: Take into account costs for expansion and costs for supply
function calculateLimitGateway() {
  // Prioritize first Robotics facility before second Gateway
  if (TotalCount.Gateway && !TotalCount.RoboticsFacility) return 1;

  // Prioritize new Gateway to have more Gateways than Nexuses
  if (TotalCount.Gateway <= ActiveCount.Nexus) return ActiveCount.Gateway + 1;

  const isProducingWorkers = (TotalCount.Probe < Limit.Probe);
  const idleNexuses = isProducingWorkers ? ActiveCount.Nexus - (TotalCount.Probe - ActiveCount.Probe) : 0;
  const idleGateways = ActiveCount.Gateway - (TotalCount.Sentry - ActiveCount.Sentry) - (TotalCount.Stalker - ActiveCount.Stalker) - (TotalCount.Zealot - ActiveCount.Zealot);
  const idleRobos = ActiveCount.RoboticsFacility - (TotalCount.Colossus - ActiveCount.Colossus) - (TotalCount.Immortal - ActiveCount.Immortal) - (TotalCount.Observer - ActiveCount.Observer);

  // Don't build more production facilities while there are idle ones
  if (idleNexuses || idleGateways || idleRobos) return TotalCount.Gateway;

  const mineralIncomePerSecond = ActiveCount.Probe - TotalCount.Assimilator * 3;
  let mineralCostPerSecond = TotalCount.Gateway * MineralCostPerSecondGateway + TotalCount.RoboticsFacility * MineralCostPerSecondRobo;
  if (Resources.supplyLimit < 200) {
    mineralCostPerSecond += MineralCostPerSecondExpand;
  }
  if (isProducingWorkers) {
    mineralCostPerSecond += TotalCount.Nexus * MineralCostPerSecondNexus;
  }

  const availableMineralIncomePerSecond = (mineralIncomePerSecond - mineralCostPerSecond);

  return TotalCount.Gateway + Math.floor(availableMineralIncomePerSecond / MineralCostPerSecondGateway);
}
