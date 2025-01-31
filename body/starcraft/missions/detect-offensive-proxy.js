import Mission from "../mission.js";
import Order from "../order.js";
import Tiers from "../map/tier.js";
import Wall from "../map/wall.js";
import { ActiveCount } from "../memo/count.js";
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

    if (isBasicEconomyAndDefenseEstablished()) {
      console.log("Mission 'Detect offensive proxy' is over.");
      this.isMissionComplete = true;
      return;
    }

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
        Plan.BaseLimit = Plan.MULTI_BASE;
      }
    } else {
      if (isOffensiveProxyStart(this.perimeterZones)) {
        console.log("Offensive proxy started.");
        this.isOffensiveProxyDetected = true;
        Plan.BaseLimit = Plan.ONE_BASE;

        cancelConstructionsOutsideHomeBase(this.outerZones);
      }
    }
  }

}

function getPerimeterZones() {
  const zones = [];
  const walls = Wall.list();

  if (walls.length) {
    const wall = walls[0];

    for (let level = wall.tier.level + 1; level >= 0; level--) {
      const tier = Tiers[level];

      for (const zone of tier.zones) {
        if (zone.cells.size) {
          zones.push(zone);
        }
      }
    }
  }

  return zones;
}

function getOuterZones(zones) {
  return zones.filter(zone => (zone.tier.level >= 3));
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

function isOffensiveProxyStart(zones) {
  if (ActiveCount.Stalker) return false;
  if (ActiveCount.Zealot) return false;

  for (const zone of zones) {
    for (const threat of zone.threats) {
      if (!threat.type.isWorker) {
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

function cancelConstructionsOutsideHomeBase(zones) {
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
