import harvestMinerals from "./minerals.js";
import transferWorkers from "./transfers.js";
import harvestVespene from "./vespene.js";

export default function() {
  harvestMinerals();
  harvestVespene();
  transferWorkers();
}
