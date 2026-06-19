import neutralizeNydus from "./neutralize-nydus.js";
import neutralizeProxies from "./neutralize-proxies.js";

export default function() {
  neutralizeNydus();
  neutralizeProxies();
}
