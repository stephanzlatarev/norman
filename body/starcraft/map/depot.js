import Zone from "./zone.js";

const DEPOT_MINERAL_DISTANCE = { left: 6, top: 5.5, right: 7, bottom: 6.5 };
const DEPOT_VESPENE_DISTANCE = { left: 6.5, top: 6.5, right: 7.5, bottom: 7.5 };

const depots = [];

export default class Depot extends Zone {

  isDepot = true;

  // The workers assigned to this depot
  workers = new Set();

  // Is active when the depot building is operational
  isActive = false;

  // The capacity for harvest workers
  capacity = 0;

  // Is staturated when enough workers are assigned to this depot
  isSaturated = false;

  constructor(location, rally, minerals, vespene) {
    super(location.x, location.y, location.margin);

    this.harvestRally = rally;
    this.exitRally = rally ? { x: location.x + location.x - rally.x, y: location.y + location.y - rally.y } : null;

    this.minerals = minerals.sort((a, b) => (a.d - b.d));
    this.vespene = vespene.sort((a, b) => (a.d - b.d));

    depots.push(this);
  }

  assignWorker(worker) {
    if (worker.depot) {
      worker.depot.releaseWorker(worker);
    }

    this.workers.add(worker);
    worker.depot = this;
  }

  releaseWorker(worker) {
    this.workers.delete(worker);
    worker.depot = null;
  }

  remove() {
    const index = depots.indexOf(this);

    if (index >= 0) {
      depots.splice(index, 1);
    }
  }

  static list() {
    return depots;
  }

  static order() {
    depots.sort((a, b) => (a.d - b.d));
  }

}

export function createDepots(board, resources, base) {
  const resourceset = new Set(resources);

  for (const area of board.areas) {
    const cluster = findResourceCluster(area, resourceset);

    if (!cluster) continue;

    // Calculate distance to depot for each resource in the cluster
    for (const resource of cluster.resources) {
      const dx = resource.body.x - cluster.depot.x;
      const dy = resource.body.y - cluster.depot.y;

      resource.d = Math.sqrt(dx * dx + dy * dy);
    }

    const minerals = cluster.resources.filter(resource => resource.type.isMinerals);
    const vespene = cluster.resources.filter(resource => resource.type.isVespene);

    area.depot = new Depot(cluster.depot, cluster.harvest, minerals, vespene);

    if ((base.body.x === cluster.depot.x) && (base.body.y === cluster.depot.y)) {
      base.depot = area.depot;
    }
  }
}

function findResourceCluster(area, resources) {
  const cluster = {
    boundary: { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
    depot: { x: area.center.x, y: area.center.y },
    harvest: { x: area.center.x, y: area.center.y },
    resources: [],
  };

  for (const resource of resources) {
    if (resource.cell.area === area) {
      addResourceToCluster(resource, cluster, resources);
    }
  }

  if (cluster.resources.length) {
    return positionDepot(cluster);
  }
}

function addResourceToCluster(resource, cluster, resources) {
  const b = cluster.boundary;
  const r = resource.body;

  b.left = Math.min(b.left, r.x);
  b.top = Math.min(b.top, r.y);
  b.right = Math.max(b.right, r.x);
  b.bottom = Math.max(b.bottom, r.y);

  cluster.resources.push(resource);
  resources.delete(resource);
}

function positionDepot(cluster) {
  const clusterCenterX = (cluster.boundary.left + cluster.boundary.right) / 2;
  const clusterCenterY = (cluster.boundary.top + cluster.boundary.bottom) / 2;

  let xs = new Map();
  let ys = new Map();

  for (const resource of cluster.resources) {
    const distance = resource.type.isMinerals ? DEPOT_MINERAL_DISTANCE : DEPOT_VESPENE_DISTANCE;
    const body = resource.body;

    if (body.x < clusterCenterX) {
      inc(xs, body.x + distance.right);
    } else {
      inc(xs, body.x - distance.left);
    }

    if (body.y < clusterCenterY) {
      inc(ys, body.y + distance.bottom);
    } else {
      inc(ys, body.y - distance.top);
    }
  }

  const depotX = most(xs);
  const depotY = most(ys);

  let dx = 0;
  let dy = 0;

  for (const resource of cluster.resources) {
    const body = resource.body;

    if (body.x < depotX) {
      dx--;
    } else {
      dx++;
    }

    if (body.y < depotY) {
      dy--;
    } else {
      dy++;
    }
  }

  cluster.depot.x = depotX - 0.5;
  cluster.depot.y = depotY - 0.5;
  cluster.harvest.x = cluster.depot.x + 3 * Math.sign(dx);
  cluster.harvest.y = cluster.depot.y + 3 * Math.sign(dy);

  return cluster;
}

function inc(map, key) {
  const value = map.get(key);

  map.set(key, value ? value + 1 : 1);
}

function most(map) {
  let mostValue = 0;
  let mostCount = 0;

  for (const [value, count] of map) {
    if (count > mostCount) {
      mostValue = value;
      mostCount = count;
    }
  }

  return mostValue;
}
