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

  for (const [cluster, zone] of zones.entries()) {
    if (!cluster.isDepot && !cluster.isGround) continue;

    for (const neighbor of cluster.neighbors) {
      zone.neighbors.add(zones.get(neighbor));
    }

    for (const [neighbor, corridor] of cluster.exits) {
      corridor.via = zones.get(corridor.via);
      zone.exits.set(zones.get(neighbor), corridor);
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
  return new Curtain(cluster.name, cluster.center, cluster.cells, false);
}

function createHallZone(cluster) {
  return new Hall(cluster.name, cluster.center, cluster.cells, cluster.border);
}

function createRampZone(cluster) {
  return new Ramp(cluster.name, cluster.center, cluster.cells);
}

class Curtain extends Zone {

  isCurtain = true;
  isPassage = false;

  constructor(name, center, cells, isPassage) {
    super(name, center, cells);

    this.isPassage = isPassage;
  }

}

class Hall extends Zone {

  isHall = true;
  isPassage = true;

}

class Ramp extends Zone {

  isRamp = true;
  isPassage = true;

}
