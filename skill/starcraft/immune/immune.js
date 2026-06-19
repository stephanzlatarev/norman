import neutralizeNydus from "./neutralize-nydus.js";
import neutralizeProxies from "./neutralize-proxies.js";
import battlecruiserHarass from "./battlecruiser-harass.js";
import defendDepotsWithWorkers from "./defend-depots-with-workers.js";

export default function() {
  neutralizeNydus();
  neutralizeProxies();
  battlecruiserHarass();
  defendDepotsWithWorkers();
}
