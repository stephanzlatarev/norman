import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import Map from "../map/map.js";
import Wall from "../map/wall.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import Resources from "../memo/resources.js";

// TODO: Calculate time to new supply from nexuses and pylons in progress of building. Calculate time to supply cap looking at production facilities and ordered units. Build pylons just in time.

export default class BuildPylonsMission extends Mission {

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

    if ((Resources.supplyUsed < 20) && (TotalCount.Pylon >= 1)) return; // Too early for a second pylon

    const pos = findFirstPylon() || findPylonForSupply(this.home);

    if (pos) {
      this.job = new Build("Pylon", pos);
      this.job.priority = 100;
    }
  }

}

function locateHomeZone() {
  return Units.buildings().values().next().value.depot;
}

function findFirstPylon() {
  if (TotalCount.Pylon >= 1) return; // First pylon is already built

  const pylon = Types.unit("Pylon");

  for (const wall of Wall.list()) {
    const plot = wall.getPlot(pylon);

    if (plot && Map.canPlace(plot, plot.x, plot.y, 2)) {
      return plot;
    }
  }
}

function findPylonForSupply(home) {
  if (Resources.supplyLimit >= 200) return;

  // TODO: Also count a nexus when currently building but only if remaining time to build is the same as the time to build a pylon
  const expectedSupply = ActiveCount.Nexus * 15 + TotalCount.Pylon * 8;

  if (Resources.supplyUsed + 8 >= expectedSupply) {
    return findPylonPlotOnMap(home);
  }

  const timeToConsumeSupply = (expectedSupply - Resources.supplyUsed) / countSupplyConsumptionRate();
  const timeToIncreaseSupply = Types.unit("Pylon").buildTime + 5 * 22.4; // Assume 5 seconds for probe to reach pylon construction site

  if (timeToConsumeSupply <= timeToIncreaseSupply) {
    return findPylonPlotOnMap(home);
  }
}

function countSupplyConsumptionRate() {
  let consumption = 0;

  for (const building of Units.buildings().values()) {
    if (building.type.supplyConsumptionRate) {
      consumption += building.type.supplyConsumptionRate;
    }
  }

  return consumption;
}

// TODO: Optimize by remembering found plots and re-using them when pylons are destroyed but otherwise continue the search from where last plot was found
function findPylonPlotOnMap(home) {
  const checked = new Set();
  const next = new Set();

  next.add(home);

  for (const zone of next) {
    const plot = findPylonPlotInZone(zone.isDepot ? findDepotExitZone(zone) : zone);

    if (plot) return plot;

    checked.add(zone);

    for (const one of getNeighborZones(zone)) {
      if (!checked.has(one)) {
        next.add(one);
      }
    }

    next.delete(zone);
  }
}

function findDepotExitZone(depot) {
  return {
    x: (depot.exitRally.x > depot.x) ? Math.floor(depot.exitRally.x + 1) : Math.ceil(depot.exitRally.x - 1),
    y: (depot.exitRally.y > depot.y) ? Math.floor(depot.exitRally.y + 1) : Math.ceil(depot.exitRally.y - 1)
  };
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

function findPylonPlotInZone(zone) {
  const x = Math.floor(zone.x);
  const y = Math.floor(zone.y);

  if (Map.canPlace(zone, x, y, 2)) return { x: x, y: y };

  if (Map.canPlace(zone, x + 10, y, 2)) return { x: x + 10, y: y };
  if (Map.canPlace(zone, x - 10, y, 2)) return { x: x - 10, y: y };

  if (Map.canPlace(zone, x + 5, y - 10, 2)) return { x: x + 5, y: y - 10 };
  if (Map.canPlace(zone, x - 5, y - 10, 2)) return { x: x - 5, y: y - 10 };
  if (Map.canPlace(zone, x - 5, y + 10, 2)) return { x: x - 5, y: y + 10 };
  if (Map.canPlace(zone, x + 5, y + 10, 2)) return { x: x + 5, y: y + 10 };

  if (Map.canPlace(zone, x, y + 20, 2)) return { x: x, y: y + 20 };
  if (Map.canPlace(zone, x, y - 20, 2)) return { x: x, y: y - 20 };
}
