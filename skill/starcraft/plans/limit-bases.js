import { TotalCount } from "../intel/imports.js";
import { Depot, Memory } from "./imports.js";

export default function() {
  if (Memory.DeploymentOutreach < Memory.DeploymentOutreachExpandDefense) {
    Memory.LimitBase = TotalCount.Nexus;
  } else if (Memory.DeploymentOutreach === Memory.DeploymentOutreachExpandDefense) {
    Memory.LimitBase = Math.min(TotalCount.Nexus + 1, Depot.list().length);
  } else {
    Memory.LimitBase = Depot.list().length;
  }
}

// function cancelExposedConstructions() {
//   for (const building of Units.buildings().values()) {
//     // Keep all buildings in the home base
//     if (building.zone === Depot.home) continue;

//     // Keep the Gateway so that in case it finishes we can start a CyberneticsCore sooner
//     if (building.type.name === "Gateway") continue;

//     // Keep CyberneticsCore if it's halfway ready.
//     if ((building.type.name === "CyberneticsCore") && (building.buildProgress > 0.5)) continue;

//     if (building.buildProgress < 1) {
//       new Order(building, 3659).accept(true);
//     }
//   }
// }
