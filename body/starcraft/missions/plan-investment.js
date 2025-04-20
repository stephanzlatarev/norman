import Mission from "../mission.js";
import Job from "../job.js";
import Types from "../types.js";
import Depot from "../map/depot.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";
import Limit from "../memo/limit.js";
import Plan from "../memo/plan.js";
import Priority from "../memo/priority.js";
import Resources from "../memo/resources.js";

let plan = doStartUp;
let encounteredMarineCount = 0;
let encounteredZealotCount = 0;
let encounteredZerglingCount = 0;

export default class PlanInvestmentsMission extends Mission {

  run() {
    encounteredMarineCount = Math.max(VisibleCount.Marine, encounteredMarineCount);
    encounteredZealotCount = Math.max(VisibleCount.Zealot, encounteredZealotCount);
    encounteredZerglingCount = Math.max(VisibleCount.Zergling, encounteredZerglingCount);

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
  Limit.Forge = 0;
  Limit.Sentry = 0;
  Limit.Stalker = (TotalCount.Nexus > 1) ? 1 : 0;
  Limit.Zealot = TotalCount.CyberneticsCore ? 1 : 0;

  Priority.Assimilator = 90;
  Priority.CyberneticsCore = 80;
  Priority.Gateway = 70;
  Priority.Nexus = 50;
  Priority.Stalker = 50;
  Priority.Zealot = 50;

  if (Plan.BaseLimit === Plan.ONE_BASE) {
    Plan.WallNatural = Plan.WALL_NATURAL_OFF;
    plan = doOneBaseDefense;
    console.log("Transition to one base defense.");
  } else if (VisibleCount.SpawningPool || encounteredZerglingCount) {
    Plan.WallNatural = Plan.WALL_NATURAL_READY;
    plan = doEnforceWallNatural;
    console.log("Transition to enforcing wall to natural expansion.");
  } else if (TotalCount.Stalker) {
    plan = doGroundArmyMaxOut;
    console.log("Transition to maxing out with ground army.");
  }
}

function doOneBaseDefense() {
  Limit.Immortal = Infinity;
  Limit.Stalker = Infinity;
  Limit.Probe = 26;
  Limit.Observer = 1;
  Limit.Sentry = 1;
  Limit.Zealot = 0;
  Limit.Colossus = 0;
  Limit.DarkTemplar = 0;

  Limit.Nexus = 1;
  Limit.Assimilator = calculateLimitAssimilator();
  Limit.Gateway = TotalCount.Stalker ? 3 : 2;
  Limit.CyberneticsCore = 1;
  Limit.ShieldBattery = (ActiveCount.Stalker >= 3) ? 1 : 0;
  Limit.RoboticsFacility = (ActiveCount.Stalker >= 3) ? 1 : 0;
  Limit.Forge = 0;

  Priority.CyberneticsCore = 100;
  Priority.Observer = 100;
  Priority.ShieldBattery = 100;
  Priority.Immortal = 95;
  Priority.Gateway = 90;
  Priority.Sentry = (ActiveCount.Stalker > 2) ? 90 : 50;
  Priority.Stalker = 80;
  Priority.Probe = 75;
  Priority.RoboticsFacility = 70;
  Priority.Nexus = 0;
  Priority.Zealot = 0;

  if (Plan.BaseLimit === Plan.MULTI_BASE) {
    plan = doGroundArmyMaxOut;
    console.log("Transition to maxing out with ground army.");
  }
}

function doEnforceWallNatural() {
  const twoBases = (ActiveCount.Immortal + ActiveCount.Stalker >= 4);

  Limit.Immortal = Infinity;
  Limit.Stalker = Infinity;
  Limit.Probe = twoBases ? 46 : 26;
  Limit.Zealot = ActiveCount.Immortal ? 0 : 1;
  Limit.Observer = twoBases ? 1 : 0;
  Limit.Colossus = 0;
  Limit.Sentry = 0;
  Limit.DarkTemplar = 0;

  Limit.Nexus = twoBases ? 2 : 1;
  Limit.Assimilator = calculateLimitAssimilator();
  Limit.Gateway = 2;
  Limit.CyberneticsCore = 1;
  Limit.ShieldBattery = ((TotalCount.Gateway >= 2) && ((TotalCount.Stalker >= 1) || (TotalCount.Zealot >= 1))) ? 1 : 0;
  Limit.RoboticsFacility = (TotalCount.ShieldBattery && (ActiveCount.Stalker >= 3)) ? 1 : 0;
  Limit.Forge = 0;

  Priority.ShieldBattery = 100;
  Priority.CyberneticsCore = 100;
  Priority.Observer = 100;
  Priority.Nexus = (twoBases && (TotalCount.Nexus === 1)) ? 100 : 0;
  Priority.Zealot = 95;
  Priority.Immortal = 95;
  Priority.Gateway = (TotalCount.Gateway < 2) ? 90 : 60;
  Priority.Stalker = 80;
  Priority.Probe = 75;
  Priority.RoboticsFacility = 70;

  if (Plan.BaseLimit === Plan.ONE_BASE) {
    Plan.WallNatural = Plan.WALL_NATURAL_OFF;
    plan = doOneBaseDefense;
    console.log("Transition to one base defense.");
  } else if (twoBases && (ActiveCount.Nexus >= 2) && (ActiveCount.Probe >= 33) && (ActiveCount.Stalker > 4)) {
    Plan.WallNatural = Plan.WALL_NATURAL_OFF;
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

  if ((encounteredMarineCount >= 6) || (encounteredZealotCount >= 3) || (encounteredZerglingCount >= 12)) {
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

  Limit.CyberneticsCore = 1;

  if (Plan.BaseLimit === Plan.ONE_BASE) {
    Plan.WallNatural = Plan.WALL_NATURAL_OFF;
    plan = doOneBaseDefense;
    console.log("Transition to one base defense.");
  } else if ((Resources.loop < 3000) && encounteredZerglingCount) {
    Plan.WallNatural = Plan.WALL_NATURAL_READY;
    plan = doEnforceWallNatural;
    console.log("Transition to enforcing wall to natural expansion.");
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
      return getBuildProgressOfFirstGateway() > 0.80;
    }
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
