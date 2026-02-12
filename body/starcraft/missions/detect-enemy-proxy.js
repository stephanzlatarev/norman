import Memory from "../../../code/memory.js";
import Mission from "../mission.js";
import Depot from "../map/depot.js";

// When enemy warriors are seen near home base before basic economy and basic defense are established
// Then defend inside the established bases without expanding further
export default class DetectEnemyProxyMission extends Mission {

  run() {
    // Once we have basic military level, stop looking for enemy proxies
    if (Memory.MilestoneBasicMilitary) {
      Memory.DetectedEnemyProxy = false;
      return;
    }

    if (Memory.DetectedEnemyProxy) {
      checkEnemyProxyEnd();
    } else {
      checkEnemyProxyStart();
    }
  }

}

function checkEnemyProxyStart() {
  for (const sector of Depot.home.horizon) {
    for (const threat of sector.threats) {
      if (threat.type.isBuilding && !threat.type.damageGround) {
        console.log("Enemy proxy", threat.type.name, threat.nick, "detected in sector", sector.name);
        Memory.DetectedEnemyProxy = true;
        return;
      }
    }
  }
}

function checkEnemyProxyEnd() {
  for (const sector of Depot.home.horizon) {
    if (sector.threats.size) {
      // Enemy proxy is still there
      return;
    }
  }

  console.log("Enemy proxy cleared");
  Memory.DetectedEnemyProxy = false;
}
