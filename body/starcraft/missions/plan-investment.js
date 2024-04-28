import Mission from "../mission.js";
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
  Priority.Gateway = 70;
  Limit.Gateway = 1;

  Priority.Nexus = 50;
  Limit.Nexus = !TotalCount.Gateway ? 1 : 2;

  Limit.Assimilator = 0;
  Limit.CyberneticsCore = 0;
  Limit.Forge = 0;
  Limit.ShieldBattery = 0;

  if (VisibleCount.SpawningPool || VisibleCount.Zergling) {
    plan = doEnforceWallNatural;
    console.log("Transition to enforcing wall to natural expansion.");
  }

  if (TotalCount.Nexus > 1) {
    plan = doGroundArmyMaxOut;
    console.log("Transition to maxing out with ground army.");
  }
}

function doEnforceWallNatural() {
  Limit.Probe = 22;
  Limit.Sentry = 0;
  Limit.Observer = 0;
  Limit.Zealot = 1;

  Limit.Nexus = 1;
  Limit.Assimilator = 2;
  Limit.Gateway = 2;
  Limit.CyberneticsCore = 1;
  Limit.RoboticsFacility = 1;
  Limit.Forge = 0;
  Limit.ShieldBattery = ActiveCount.CyberneticsCore ? 1: 0;

  Priority.CyberneticsCore = 100;
  Priority.Immortal = 100;
  Priority.Gateway = 90;
  Priority.Stalker = 80;
  Priority.ShieldBattery = 70;
  Priority.RoboticsFacility = 60;
  Priority.Zealot = 50;
  Priority.Probe = 40;

  if (TotalCount.Immortal > 1) {
    plan = doGroundArmyMaxOut;
    console.log("Transition to maxing out with ground army.");
  }
}

function doGroundArmyMaxOut() {
  Limit.Probe = 100;
  Limit.Observer = 1;
  Limit.Sentry = Infinity;
  Limit.Zealot = Infinity;
  Priority.Probe = 90;
  Priority.Immortal = 50;
  Priority.Sentry = 50;
  Priority.Stalker = 50;
  Priority.Zealot = 50;

  if (Resources.supplyLimit < 198) {
    Priority.Nexus = 70;
    Limit.Nexus = !TotalCount.RoboticsFacility ? 2 : calculateLimitNexus();
  } else {
    Priority.Nexus = 40;
    Limit.Nexus = Infinity;
  }
  Limit.Assimilator = calculateLimitAssimilator();

  Priority.Gateway = 50;
  Limit.Gateway = Math.floor(Math.min(
      (TotalCount.Nexus - 1) * 3,                            // Gateways should not grow more than nexuses
      TotalCount.Probe / 12 - TotalCount.RoboticsFacility,   // Gateways should not grow more than income
      TotalCount.RoboticsFacility ? Infinity : 1,            // Prioritize first Robotics facility before second Gateway
  ));
  Limit.RoboticsFacility = 1;

  Limit.Forge = (TotalCount.Gateway >= 3) ? 1 : 0;
  Limit.CyberneticsCore = 1;
  Limit.ShieldBattery = 0;

  if ((Resources.loop < 3000) && VisibleCount.Zergling) {
    plan = doEnforceWallNatural;
    console.log("Transition to enforcing wall to natural expansion.");
  }
}

// When time to reach harvester capacity is less than time to increase harvester capacity, then build a new nexus
// Time to increase harvester capacity = time for probe to reach construction site + nexus build time
// Time to reach harvester capacity = time to build probe * Math.floor( free capacity / number of active nexuses)
// TODO: Improve precision by calculating the remaining time of all building probes, and by calculating the time for a probe to move to the next expansion site
function calculateLimitNexus() {
  if (TotalCount.HarvesterCapacity >= Limit.Probe) return TotalCount.Nexus;

  const timeForProbeToReachConstructionSite = 5 * 22.4; // Assume 5 seconds
  const timeToBuildNexus = Types.unit("Nexus").buildTime;
  const timeToIncreaseHarvesterCapacity = timeForProbeToReachConstructionSite + timeToBuildNexus;

  const timeToBuildProbe = Types.unit("Probe").buildTime;
  const freeCapacity = TotalCount.HarvesterCapacity - TotalCount.Probe;
  const timeToReachHarvesterCapacity = ActiveCount.Nexus ? timeToBuildProbe * Math.floor(freeCapacity / ActiveCount.Nexus) : Infinity;

  return (timeToReachHarvesterCapacity <= timeToIncreaseHarvesterCapacity) ? TotalCount.Nexus + 1 : TotalCount.Nexus;
}

function calculateLimitAssimilator() {
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
