import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import Depot from "../map/depot.js";
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

    const pos = findWallPylon() || findPylonForSupply(this.home);

    if (pos) {
      this.job = new Build("Pylon", pos);
      this.job.priority = 100;
    }
  }

}

function locateHomeZone() {
  return Units.buildings().values().next().value.zone;
}

let wallPlot;
let wallPylon;

function findWallPylon() {
  if (wallPylon && wallPylon.isAlive) return; // Wall pylon is already built

  if (wallPlot) {
    for (const building of Units.buildings().values()) {
      if ((building.body.x === wallPlot.x) && (building.body.y === wallPlot.y)) {
        wallPylon = building;
        return;
      }
    }

    return wallPlot;
  }

  const pylon = Types.unit("Pylon");

  for (const wall of Wall.list()) {
    const plot = wall.getPlot(pylon);

    if (plot && Map.accepts(plot, plot.x, plot.y, 2)) {
      wallPlot = plot;
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
  return findPylonPlotByDepot() || findPylonPlotByZone(home);
}

function findPylonPlotByDepot() {
  for (const depot of Depot.list()) {
    if (!depot.isActive) continue;

    const plot = getAnchor(depot);

    if (Map.accepts(depot, plot.x, plot.y, 2)) {
      return plot;
    }
  }
}

function findPylonPlotByZone(home) {
  const checked = new Set();
  const next = new Set();

  next.add(home);

  for (const zone of next) {
    const plot = findPylonPlotInZone(zone);

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

const ANCHORS = [
  { x: +10, y: 0 }, { x: -10, y: 0 },
  { x: +5, y: +10 }, { x: +5, y: -10 },
  { x: -5, y: +10 }, { x: -5, y: -10 },
];
const PLOTS = [...ANCHORS, ...ANCHORS.map(one => ({ x: one.x, y : one.y + 2})), ...ANCHORS.map(one => ({ x: one.x, y : one.y - 2}))];

function findPylonPlotInZone(zone) {
  const { x, y } = getAnchor(zone);

  for (const one of PLOTS) {
    const xx = x + one.x;
    const yy = y + one.y;

    if (zone.isDepot && isHarvestArea(zone, xx, yy)) continue;

    if (Map.accepts(zone, xx, yy, 2)) {
      return { x: xx, y: yy };
    }
  }
}

function getAnchor(zone) {
  if (zone.isDepot) {
    return {
      x: (zone.exitRally.x > zone.x) ? Math.floor(zone.exitRally.x + 1) : Math.ceil(zone.exitRally.x - 1),
      y: (zone.exitRally.y > zone.y) ? Math.floor(zone.exitRally.y + 1) : Math.ceil(zone.exitRally.y - 1),
    };
  } else {
    return {
      x: Math.floor(zone.x),
      y: Math.floor(zone.y),
    };
  }
}

function isHarvestArea(zone, x, y) {
  const dx = Math.sign(zone.x - zone.harvestRally.x);
  const dy = Math.sign(zone.y - zone.harvestRally.y);

  if (dx === 0) {
    return Math.sign(zone.y - y) === dy;
  } else if (dy === 0) {
    return Math.sign(zone.x - x) === dx;
  }

  return (Math.sign(zone.x - x) === dx) && (Math.sign(zone.y - y) === dy);
}
