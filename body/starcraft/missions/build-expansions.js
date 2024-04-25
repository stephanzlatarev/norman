import Mission from "../mission.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import Map from "../map/map.js";

export default class BuildExpansionsMission extends Mission {

  home;
  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        this.job = null;
      } else if (!this.job.isDone) {
        return;
      }
    }

    if (!this.home) {
      this.home = locateHomeZone();
    }

    const depot = findDepot(this.home);

    if (depot) {
      this.job = new Build("Nexus", depot);
    }
  }

}

function locateHomeZone() {
  return Units.buildings().values().next().value.depot;
}

function findDepot(home) {
  const checked = new Set();
  const next = new Set();

  next.add(home);

  for (const zone of next) {
    if (zone.isDepot && Map.canPlace(zone, zone.x, zone.y, 5)) {
      if (zone === home) {
        // Map is not analyzed yet
        return;
      }

      return zone;
    }

    checked.add(zone);

    for (const one of getNeighborZones(zone)) {
      if (!checked.has(one)) {
        next.add(one);
      }
    }

    next.delete(zone);
  }
}

function getNeighborZones(zone) {
  const zones = new Set();

  for (const corridor of zone.corridors) {
    for (const one of corridor.zones) {
      if (one !== zone) {
        zones.add(one);
      }
    }
  }

  return zones;
}
