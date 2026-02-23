import harvestMinerals from "./minerals.js";
import transferWorkers from "./transfers.js";
import harvestVespene from "./vespene.js";
import buildWorkers from "./workers.js";

export default function() {
  harvestMinerals();
  harvestVespene();
  buildWorkers();
  transferWorkers();
}
