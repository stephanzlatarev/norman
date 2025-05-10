import Memory from "../../../code/memory.js";
import Mission from "../mission.js";
import Tiers from "../map/tier.js";

// When enemy warriors are seen near home base before basic economy and basic defense are established
// Then defend inside the established bases without expanding further
export default class DetectEnemyProxyMission extends Mission {

  perimeterZones = null;

  run() {
    if (Memory.MilestoneBasicMilitary) return;

    if (!this.perimeterZones) {
      this.perimeterZones = getPerimeterZones();

      if (!this.perimeterZones.length) {
        console.log("Mission 'Detect enemy proxy' is cancelled.");

        return;
      }
    }

    if (Memory.DetectedEnemyProxy) {
      checkEnemyProxyEnd(this.perimeterZones);
    } else {
      checkEnemyProxyStart(this.perimeterZones);
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

function checkEnemyProxyStart(zones) {
  for (const zone of zones) {
    for (const threat of zone.threats) {
      if (threat.type.isBuilding) {
        console.log("Enemy proxy", threat.type.name, threat.nick, "detected in zones", zones.map(zone => zone.name).join(" "));
        Memory.DetectedEnemyProxy = true;
        return;
      }
    }
  }
}

function checkEnemyProxyEnd(zones) {
  for (const zone of zones) {
    if (zone.threats.size) {
      // Enemy proxy is still there
      return;
    }
  }

  console.log("Enemy proxy cleared in zones", zones.map(zone => zone.name).join(" "));
  Memory.DetectedEnemyProxy = false;
}
