import Mission from "../mission.js";
import Types from "../types.js";
import Depot from "../map/depot.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";
import Limit from "../memo/limit.js";
import Priority from "../memo/priority.js";
import Resources from "../memo/resources.js";

let plan = doStartUp;
let encounteredZerglingCount = 0;

export default class PlanInvestmentsMission extends Mission {

  run() {
    plan();
  }

}

function doStartUp() {
  Priority.Gateway = 70;
  Limit.Gateway = 1;

  Priority.Nexus = 50;
  Limit.Nexus = !TotalCount.Gateway ? 1 : 2;

  Limit.Assimilator = 0;
  Limit.CyberneticsCore = 0;
  Limit.Forge = 0;
  Limit.ShieldBattery = 0;
  Limit.Zealot = 0;

  encounteredZerglingCount = Math.max(VisibleCount.Zergling, encounteredZerglingCount);

  if (VisibleCount.SpawningPool || encounteredZerglingCount) {
    plan = doEnforceWallNatural;
    console.log("Transition to enforcing wall to natural expansion.");
  }

  if (TotalCount.Nexus > 1) {
    plan = doGroundArmyMaxOut;
    console.log("Transition to maxing out with ground army.");
  }
}

function doEnforceWallNatural() {
  const twoBases = (ActiveCount.Immortal + ActiveCount.Stalker >= 6);

  Limit.Immortal = Infinity;
  Limit.Stalker = Infinity;
  Limit.Probe = twoBases ? 33 : 22;
  Limit.Zealot = ActiveCount.Immortal ? 0 : 1;
  Limit.Observer = twoBases ? 1 : 0;
  Limit.Colossus = 0;
  Limit.Sentry = 0;

  Limit.Nexus = twoBases ? 2 : 1;
  Limit.Assimilator = (ActiveCount.Probe >= 18) ? 2 : 1;
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
  Priority.RoboticsFacility = 70;
  Priority.Probe = 40;

  encounteredZerglingCount = Math.max(VisibleCount.Zergling, encounteredZerglingCount);

  if ((Resources.loop > 3000) && !encounteredZerglingCount) {
    plan = doGroundArmyMaxOut;
    console.log("Transition to maxing out with ground army.");
  }

  if (twoBases && (ActiveCount.Nexus >= 2) && (ActiveCount.Probe >= 33) && (ActiveCount.Stalker > 4)) {
    plan = doGroundArmyMaxOut;
    console.log("Transition to maxing out with ground army.");
  }
}

function doGroundArmyMaxOut() {
  Limit.Probe = 85;
  Limit.Immortal = 100;
  Limit.Sentry = 100;
  Limit.Stalker = 400; // Maintain 4:1 ratio of Stalker to Zealot and Stalker to Sentry
  Limit.Zealot = !TotalCount.CyberneticsCore ? 0 : 100;
  Limit.Observer = (ActiveCount.Immortal < 2) ? 1 : 2;
  Limit.Colossus = 0;

  Priority.Probe = 90;
  Priority.Observer = 80;
  Priority.Immortal = 50;
  Priority.Sentry = 50;
  Priority.Stalker = 50;
  Priority.Zealot = 50;

  if (Resources.supplyLimit < 198) {
    Limit.Nexus = !TotalCount.RoboticsFacility ? 2 : calculateLimitNexus();
    Priority.Nexus = (TotalCount.Nexus < Limit.Nexus) ? 70 : 0;
  } else {
    Limit.Nexus = Infinity;
    Priority.Nexus = 40;
  }
  Limit.Assimilator = calculateLimitAssimilator();

  Priority.Gateway = 50;
  Limit.Gateway = calculateLimitGateway();
  Limit.RoboticsFacility = 1;

  Limit.Forge = (TotalCount.Gateway >= 3) ? 1 : 0;
  Limit.CyberneticsCore = 1;
  Limit.ShieldBattery = 0;

  encounteredZerglingCount = Math.max(VisibleCount.Zergling, encounteredZerglingCount);

  if ((Resources.loop < 3000) && encounteredZerglingCount) {
    plan = doEnforceWallNatural;
    console.log("Transition to enforcing wall to natural expansion.");
  }

  if ((VisibleCount.Queen >= 5) && (VisibleCount.Warrior <= 5)) {
    plan = counterMassLightZerg;
    console.log("Transition to countering mass light zerg.");
  }
}

function counterMassLightZerg() {
  Limit.Probe = 100;
  Limit.Zealot = TotalCount.CyberneticsCore ? 100 : 0;
  Limit.Colossus = 100;
  Limit.Sentry = 10; // Maintain 10:1 ratio of Zealot to Sentry
  Limit.Observer = ActiveCount.RoboticsBay ? 33 : 2; // Maintain 3:1 ratio of Colossus to Observer and build 2 Observers before Colossi can be built
  Limit.Immortal = 0;
  Limit.Stalker = 0;

  Priority.Probe = 90;
  Priority.Observer = 90;
  Priority.Colossus = 90;
  Priority.Sentry = 50;
  Priority.Zealot = 50;

  if (Resources.supplyLimit < 198) {
    Limit.Nexus = !TotalCount.RoboticsFacility ? 2 : calculateLimitNexus();
    Priority.Nexus = (TotalCount.Nexus < Limit.Nexus) ? 70 : 0;
  } else {
    Limit.Nexus = Infinity;
    Priority.Nexus = 40;
  }
  Limit.Assimilator = calculateLimitAssimilator();

  Priority.Gateway = 50;
  Limit.Gateway = calculateLimitGateway();
  Limit.CyberneticsCore = 1;
  Limit.RoboticsFacility = 1;
  Limit.Forge = 1;
  Limit.TwilightCouncil = 1;
  Limit.RoboticsBay = 1;

  Limit.Stalker = 0;
  Limit.Immortal = 0;
  Limit.ShieldBattery = 0;
}

// When time to reach harvester capacity is less than time to increase harvester capacity, then build a new nexus
// Time to increase harvester capacity = time for probe to reach construction site + nexus build time
// Time to reach harvester capacity = time to build probe * Math.floor( free capacity / number of active nexuses)
// TODO: Improve precision by calculating the remaining time of all building probes, and by calculating the time for a probe to move to the next expansion site
function calculateLimitNexus() {
  if (TotalCount.HarvesterCapacity >= Limit.Probe) return TotalCount.Nexus;
  if (TotalCount.Nexus >= ActiveCount.Gateway) return TotalCount.Nexus;

  const timeForProbeToReachConstructionSite = 5 * 22.4; // Assume 5 seconds
  const timeToBuildNexus = Types.unit("Nexus").buildTime;
  const timeToIncreaseHarvesterCapacity = timeForProbeToReachConstructionSite + timeToBuildNexus;

  const timeToBuildProbe = Types.unit("Probe").buildTime;
  const freeCapacity = TotalCount.HarvesterCapacity - TotalCount.Probe;
  const timeToReachHarvesterCapacity = ActiveCount.Nexus ? timeToBuildProbe * Math.floor(freeCapacity / ActiveCount.Nexus) : Infinity;

  return (timeToReachHarvesterCapacity <= timeToIncreaseHarvesterCapacity) ? TotalCount.Nexus + 1 : TotalCount.Nexus;
}

function calculateLimitAssimilator() {
  if (!TotalCount.CyberneticsCore) return 0;

  let limit = 0;

  for (const depot of Depot.list()) {
    if (!depot.isActive) continue;

    for (const vespene of depot.vespene) {
      if (vespene.extractor) {
        // Assimilator is already built
        limit++;
      } else if (depot.isSaturated) {
        // New assimilator can be already built
        limit++;
      }
    }
  }

  return limit;
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
  const idleRobos = ActiveCount.RoboticsFacility - (TotalCount.Immortal - ActiveCount.Immortal) - (TotalCount.Observer - ActiveCount.Observer);

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
