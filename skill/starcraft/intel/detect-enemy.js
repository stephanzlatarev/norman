import detectEnemyExpansion from "./detect-enemy-expansion.js";
import detectEnemyHoard from "./detect-enemy-hoard.js";
import detectEnemyProxy from "./detect-enemy-proxy.js";
import detectEnemyRush from "./detect-enemy-rush.js";

export default function() {
  detectEnemyExpansion();
  detectEnemyHoard();
  detectEnemyProxy();
  detectEnemyRush();
}
