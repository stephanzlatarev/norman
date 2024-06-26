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
  Limit.Zealot = 0;

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
  const twoBases = (ActiveCount.Immortal >= 2);

  Limit.Probe = twoBases ? 33 : 22;
  Limit.Sentry = 0;
  Limit.Observer = 0;
  Limit.Zealot = ActiveCount.Immortal ? 0 : 1;

  Limit.Nexus = twoBases ? 2 : 1;
  Limit.Assimilator = (ActiveCount.Probe >= 18) ? 2 : 1;
  Limit.Gateway = 2;
  Limit.CyberneticsCore = 1;
  Limit.RoboticsFacility = 1;
  Limit.Forge = 0;
  Limit.ShieldBattery = ActiveCount.CyberneticsCore ? 1: 0;

  Priority.ShieldBattery = 100;
  Priority.CyberneticsCore = 100;
  Priority.Nexus = (twoBases && (TotalCount.Nexus === 1)) ? 100 : 0;
  Priority.Immortal = 95;
  Priority.Gateway = (TotalCount.Gateway < 2) ? 90 : 60;
  Priority.Stalker = 80;
  Priority.RoboticsFacility = 70;
  Priority.Zealot = 50;
  Priority.Probe = 40;

  if (twoBases && (ActiveCount.Nexus >= 2) && (ActiveCount.Probe >= 33) && (ActiveCount.Stalker > 4)) {
    plan = doGroundArmyMaxOut;
    console.log("Transition to maxing out with ground army.");
  }
}

function doGroundArmyMaxOut() {
  Limit.Probe = 85;
  Limit.Observer = (ActiveCount.Immortal < 2) ? 1 : 2;
  Limit.Sentry = Infinity;
  Limit.Zealot = !TotalCount.CyberneticsCore ? 0 : Infinity;
  Priority.Probe = 90;
  Priority.Observer = (ActiveCount.Immortal < 2) ? 10 : 90;
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
  Limit.Gateway = Math.floor(Math.min(
    TotalCount.RoboticsFacility ? Infinity : 1,               // Prioritize first Robotics facility before second Gateway
    (TotalCount.Probe - TotalCount.RoboticsFacility * 6) / 5, // Gateways should not grow more than income
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
  if ((TotalCount.Nexus === 2) && (TotalCount.Gateway < 3)) return 2;
  if ((TotalCount.Nexus === 3) && (TotalCount.Gateway < 6)) return 3;
  if ((TotalCount.Nexus === 4) && (TotalCount.Gateway < 9)) return 4;

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
