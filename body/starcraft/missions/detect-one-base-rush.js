import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import Depot from "../map/depot.js";
import Tiers from "../map/tier.js";
import { ActiveCount } from "../memo/count.js";
import Enemy from "../memo/enemy.js";
import Plan from "../memo/plan.js";

const IS_PRODUCING_WARRIORS = { Barracks: 1, Gateway: 1 };

// When multiple warrior facilities or multiple enemy warriors are detected before basic economy and basic defense are established
// Then defend inside the established bases without expanding further
export default class DetectOneBaseRushMission extends Mission {

  isRushDetected = false;
  isMissionComplete = false;

  run() {
    if (this.isMissionComplete) return;

    if (isBasicEconomyAndDefenseEstablished()) {
      console.log("Mission 'Detect one-base rush' is over.");
      this.isMissionComplete = true;
    } else if (this.isRushDetected) {
      if (isRushEnd()) {
        console.log("One-base rush is over.");
        this.isMissionComplete = true;
        Plan.setBaseLimit(this, Plan.MULTI_BASE);
      }
    } else {
      if (isRushStart()) {
        console.log("One-base rush detected.");
        this.isRushDetected = true;
        Plan.setBaseLimit(this, Plan.ONE_BASE);

        cancelConstructionsOutsideHomeBase();
      }
    }
  }

}

function isBasicEconomyAndDefenseEstablished() {
  if (ActiveCount.Nexus < 2) return false;
  if (!ActiveCount.Gateway) return false;
  if (!ActiveCount.CyberneticsCore) return false;
  if (ActiveCount.Assimilator < 4) return false;
  if (ActiveCount.Probe < 52) return false;
  if (ActiveCount.Stalker < 4) return false;
  if (!ActiveCount.Observer) return false;

  return true;
}

function isRushStart() {
  const MIN_WARRIOR_COUNT = Math.max(5, ActiveCount.Colossus + ActiveCount.Immortal + ActiveCount.Stalker + ActiveCount.Sentry + ActiveCount.Zealot);
  const MIN_BARRACKS_COUNT = Math.max(1, ActiveCount.Gateway + ActiveCount.RoboticsFacility);

  let warriorCount = 0;
  let barracksCount = 0;

  for (const tier of Tiers) {
    for (const zone of tier.zones) {
      for (const threat of zone.threats) {
        if (threat.type.isWarrior) {
          warriorCount++;
        } else if (IS_PRODUCING_WARRIORS[threat.type.name]) {
          barracksCount++;
        }
      }
    }
  }

  return (warriorCount > MIN_WARRIOR_COUNT) || (barracksCount > MIN_BARRACKS_COUNT);
}

function isRushEnd() {
  for (const enemy of Units.enemies().values()) {
    if (enemy.type.isDepot && enemy.zone && (enemy.zone !== Enemy.base)) {
      return true;
    }
  }
}

function cancelConstructionsOutsideHomeBase() {
  const homebase = new Set([Depot.home, ...Depot.home.neighbors]);

  for (const tier of Tiers) {
    for (const zone of tier.zones) {
      if (homebase.has(zone)) continue;

      for (const building of zone.buildings) {
        // Keep the Gateway so that in case it finishes we can start a CyberneticsCore sooner
        if (building.type.name === "Gateway") continue;
  
        // Keep CyberneticsCore if it's halfway ready.
        if ((building.type.name === "CyberneticsCore") && (building.buildProgress > 0.5)) continue;
  
        if (building.buildProgress < 1) {
          new Order(building, 3659).accept(true);
        }
      }
    }
  }
}
