import Board from "../board.js";
import Depot from "../depot.js";
import Zone from "../zone.js";
import Units from "../../units.js";

export function createZones(clusters) {
  const depots = mapDepotsToClusters();
  const resources = mapResourcesToClusters();
  const zones = new Map();

  for (const cluster of clusters) {
    let zone;

    if (cluster.isDepot) {
      zone = createDepotZone(cluster, depots, resources);
    } else if (cluster.isGround) {
      zone = createHallZone(cluster);
    } else if (cluster.isCurtain) {
      zone = createCurtainZone(cluster);
    } else if (cluster.isRamp) {
      zone = createRampZone(cluster);
    }

    if (zone) zones.set(cluster, zone);
  }

  // Resolve corridor zones
  for (const cluster of clusters) {
    for (const [neighbor, corridor] of cluster.exits) {
      const zone = corridor.via ? zones.get(corridor.via) : null;

      if (zone) {
        corridor.via = zone;
      }
    }
  }

  // Neighbors and exits point only to the neighboring depot and ground zones 
  for (const [cluster, zone] of zones.entries()) {
    for (const [neighbor, corridor] of cluster.exits) {
      if (!neighbor.isDepot && !neighbor.isGround) continue;

      const neighborZone = zones.get(neighbor);

      zone.exits.set(neighborZone, corridor);
      if (corridor.isGroundPassable) {
        zone.neighbors.add(neighborZone);
      }

      if (corridor.via) {
        corridor.via.exits.set(zone, corridor);
        corridor.via.neighbors.add(zone);
      }
    }
  }
}

function mapDepotsToClusters() {
  const map = new Map();

  for (const unit of Units.buildings().values()) {
    if (!unit.type.isDepot) continue;

    map.set(Board.cell(unit.body.x, unit.body.y).cluster, unit);
  }

  return map;
}

function mapResourcesToClusters() {
  const map = new Map();

  for (const unit of Units.resources().values()) {
    const cluster = Board.cell(unit.body.x, unit.body.y).cluster;
    let resources = map.get(cluster);

    if (!resources) {
      resources = new Set();
      map.set(cluster, resources);
    }

    resources.add(unit);
  }

  return map;
}

function createDepotZone(cluster, depots, resources) {
  return new Depot(
    cluster.name, cluster.center, cluster.cells, cluster.border,
    resources.get(cluster), depots.get(cluster)
  );
}

function createCurtainZone(cluster) {
  const isGroundPassable = !cluster.isMinerals && ![...cluster.cells].some(cell => cell.isResource);

  return new Curtain(cluster.name, cluster.center, cluster.cells, isGroundPassable);
}

function createHallZone(cluster) {
  return new Hall(cluster.name, cluster.center, cluster.cells, cluster.border);
}

function createRampZone(cluster) {
  return new Ramp(cluster.name, cluster.center, cluster.cells);
}

class Curtain extends Zone {

  isCurtain = true;
  isGroundPassable = false;

  minerals = new Set();

  constructor(name, center, cells, isGroundPassable) {
    super(name, center, cells);

    this.isGroundPassable = isGroundPassable;
  }

  addUnit(unit) {
    super.addUnit(unit);

    if (unit.type.isMinerals) {
      this.minerals.add(unit);
    }
  }

  removeUnit(unit) {
    super.removeUnit(unit);

    if (unit.type.isMinerals) {
      this.minerals.delete(unit);
    }
  }

}

class Hall extends Zone {

  isHall = true;
  isGroundPassable = true;

}

class Ramp extends Zone {

  isRamp = true;
  isGroundPassable = true;

}
