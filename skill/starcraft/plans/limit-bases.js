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
