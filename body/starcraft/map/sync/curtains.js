import Zone from "../zone.js";

const mineralCurtains = new Set();

let initialized = false;

export function syncCurtains() {
  const zones = Zone.list();

  if (!initialized && zones.length) {
    for (const zone of zones) {
      if (zone.isCurtain && zone.minerals.size) {
        mineralCurtains.add(zone);
      }
    }
  }

  for (const zone of mineralCurtains) {
    if (!zone.minerals.size) {
      clearPassage(zone);
    }
  }
}

function clearPassage(curtain) {
  curtain.isPassage = true;

  for (const zone of Zone.list()) {
    for (const [neighbor, corridor] of zone.exits) {
      if (corridor.via === curtain) {
        zone.neighbors.add(neighbor);
      }
    }
  }

  mineralCurtains.delete(curtain);
}
