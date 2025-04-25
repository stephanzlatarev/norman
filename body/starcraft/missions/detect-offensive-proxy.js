import Mission from "../mission.js";
import Order from "../order.js";
import Tiers from "../map/tier.js";
import Plan from "../memo/plan.js";

// When enemy warriors are seen near home base before basic economy and basic defense are established
// Then defend inside the established bases without expanding further
export default class DetectOffensiveProxyMission extends Mission {

  isOffensiveProxyDetected = false;
  isMissionComplete = false;
  outerZones = null;
  perimeterZones = null;

  run() {
    if (this.isMissionComplete) return;

    if (!this.perimeterZones || !this.outerZones) {
      this.perimeterZones = getPerimeterZones();
      this.outerZones = getOuterZones(this.perimeterZones);

      if (!this.perimeterZones.length || !this.outerZones.length) {
        console.log("Mission 'Detect offensive proxy' is cancelled.");

        this.isMissionComplete = true;
        return;
      }
    }

    if (this.isOffensiveProxyDetected) {
      if (isOffensiveProxyEnd(this.perimeterZones)) {
        console.log("Offensive proxy ended.");
        this.isOffensiveProxyDetected = false;
        Plan.setBaseLimit(this, Plan.MULTI_BASE);
      } else if (Plan.isBaseSupplyLimitReached()) {
        console.log("Mission 'Detect offensive proxy' is done.");
        this.isMissionComplete = true;
        Plan.setBaseLimit(this, Plan.MULTI_BASE);
      }
    } else if (Plan.isBaseEstablished()) {
      console.log("Mission 'Detect offensive proxy' is over.");
      this.isMissionComplete = true;
      Plan.setBaseLimit(this, Plan.MULTI_BASE);
    } else if (isOffensiveProxyStart(this.perimeterZones)) {
      console.log("Offensive proxy started.");
      this.isOffensiveProxyDetected = true;
      Plan.setBaseLimit(this, Plan.ONE_BASE);

      cancelExcessConstructions(this.outerZones);
    }
  }

}

function getPerimeterZones() {
  const zones = [];

  for (let level = Math.min(5, Tiers.length - 1); level >= 0; level--) {
    const tier = Tiers[level];

    for (const zone of tier.zones) {
      zones.push(zone);
    }
  }

  return zones;
}

function getOuterZones(zones) {
  return zones.filter(zone => (zone.tier.level > 1));
}

function isOffensiveProxyStart(zones) {
  for (const zone of zones) {
    for (const threat of zone.threats) {
      if (threat.type.isBuilding) {
        console.log("Offensive proxy", threat.type.name, threat.nick, "in zones", zones.map(zone => zone.name).join(" "));
        return true;
      }
    }
  }
}

function isOffensiveProxyEnd(zones) {
  for (const zone of zones) {
    if (zone.threats.size) {
      return false;
    }
  }

  console.log("Offensive proxy cleared in zones", zones.map(zone => zone.name).join(" "));
  return true;
}

function cancelExcessConstructions(zones) {
  for (const zone of zones) {
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
