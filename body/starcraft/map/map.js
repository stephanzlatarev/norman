import Board from "./board.js";
import Depot from "./depot.js";
import Hub from "./hub.js";
import Zone from "./zone.js";
import Units from "../units.js";
import createWall from "./wall.js";

class Map {

  sync(gameInfo) {
    this.left = gameInfo.startRaw.playableArea.p0.x;
    this.top = gameInfo.startRaw.playableArea.p0.y;
    this.right = gameInfo.startRaw.playableArea.p1.x;
    this.bottom = gameInfo.startRaw.playableArea.p1.y;

    this.width = this.right - this.left;
    this.height = this.bottom - this.top;

    this.board = newBoard(gameInfo.startRaw.placementGrid, gameInfo.startRaw.pathingGrid);

    createDepots(populateBoard(this.board.copy(), { harvest: 1, resources: 1, obstacles: 1 }));
    createZones(populateBoard(this.board.copy(), { depots: 1, resources: 1, obstacles: 1 }));

    createWall(populateBoard(this.board.copy(), { obstacles: 1 }));
  }

  get(filter) {
    return populateBoard(this.board.copy(), filter);
  }

}

function newBoard(placementGrid, pathingGrid) {
  const lines = [];
  const size = placementGrid.size;

  for (let y = 0; y < size.y; y++) {
    const line = [];
    for (let x = 0; x < size.x; x++) {
      const index = x + y * size.x;
      const pos = 7 - index % 8;
      const mask = 1 << pos;

      const placement = (placementGrid.data[Math.floor(index / 8)] & mask) != 0;
      const pathing = (pathingGrid.data[Math.floor(index / 8)] & mask) != 0;

      if (placement && pathing) {
        line.push(" ");
      } else if (placement || pathing) {
        line.push("/");
      } else {
        line.push("-");
      }
    }
    lines.push(line.join(""));
  }

  for (const building of Units.buildings().values()) {
    if (building.type.isBuilding) {
      for (let i = 0; i < 5; i++) {
        const col = building.body.x - 2.5;
        const row = building.body.y - 2.5 + i;
        const line = lines[row];

        lines[row] = line.substring(0, col) + "     " + line.substring(col + 5);
      }
    }
  }

  return new Board(lines);
}

function createDepots(board) {
  const clusters = clusterResources(findClusters());

  for (const cluster of clusters) {
    const depot = board.base(Math.floor(cluster.x), Math.floor(cluster.y), 5, 10);

    if (!depot) continue;

    cluster.depot = { x: depot.x + 2.5, y: depot.y + 2.5 };
    cluster.rally = { x: cluster.depot.x + Math.sign(cluster.x - cluster.depot.x) * 3, y: cluster.depot.y + Math.sign(cluster.y - cluster.depot.y) * 3 };

    // Calculate distance to depot for each resource in the cluster
    for (const resource of cluster.resources) {
      const dx = resource.body.x - cluster.depot.x;
      const dy = resource.body.y - cluster.depot.y;

      resource.d = Math.sqrt(dx * dx + dy * dy);
    }

    const minerals = cluster.resources.filter(resource => resource.type.isMinerals);
    const vespene = cluster.resources.filter(resource => resource.type.isVespene);

    new Depot(cluster.depot, cluster.rally, minerals, vespene);
  }
}

function findClusters() {
  let clusters = [];

  for (const resource of Units.resources().values()) {
    if (!resource.type.isMinerals) continue;

    const list = [];

    for (const cluster of clusters) {
      if (isResourceInCluster(resource, cluster, 6)) {
        list.push(cluster);
      }
    }

    if (list.length === 0) {
      clusters.push([resource]);
    } else if (list.length === 1) {
      list[0].push(resource);
    } else {
      let join = [resource];
      for (const cluster of list) {
        join = join.concat(cluster);
      }

      let newClusters = [join];
      for (const cluster of clusters) {
        if (list.indexOf(cluster) < 0) {
          newClusters.push(cluster);
        }
      }
      clusters = newClusters;
    }
  }

  for (const cluster of clusters) {
    for (const resource of Units.resources().values()) {
      if (resource.type.isVespene && isResourceInCluster(resource, cluster, 10)) {
        cluster.push(resource);
      }
    }
  }

  return clusters;
}

function isResourceInCluster(resource, cluster, distance) {
  for (const object of cluster) {
    if ((Math.abs(object.body.x - resource.body.x) < distance) && (Math.abs(object.body.y - resource.body.y) < distance)) {
      return true;
    }
  }

  return false;
}

function clusterResources(clusters) {
  const result = [];
  let index = 1;

  for (const cluster of clusters) {
    if (cluster.length < 10) continue;

    let minX = 1000;
    let minY = 1000;
    let maxX = 0;
    let maxY = 0;

    for (const resource of cluster) {
      if (resource.type.isMinerals) {
        minX = Math.min(minX, resource.body.x);
        maxX = Math.max(maxX, resource.body.x);
        minY = Math.min(minY, resource.body.y);
        maxY = Math.max(maxY, resource.body.y);
      }
    }

    const x = (maxX + minX) / 2;
    const y = (maxY + minY) / 2;

    result.push({
      index: index++,
      resources: cluster,
      x: Math.floor(x),
      y: Math.floor(y),
      depot: null,
      rally: null,
    });
  }

  return result;
}

function createZones(board) {
  for (let size = 16; size >= 6; size -= 2) {
    const type = (size >= 10) ? "H" : "O";
    const radius = size / 2;
    const blocks = board.many(type, size, size, true);

    for (const block of blocks) {
      if (size >= 10) {
        new Hub(block.x + radius, block.y + radius, radius);
      } else {
        new Zone(block.x + radius, block.y + radius, radius);
      }
    }
  }
}

function populateBoard(board, filter) {
  if (filter && filter.harvest) {
    for (const unit of Units.resources().values()) {
      const x = Math.floor(unit.body.x);
      const y = Math.floor(unit.body.y);

      if (unit.type.isMinerals) {
        board.one("·", x - 4, y - 2, 8, 5);
        board.one("·", x - 3, y - 3, 6, 7);
      } else if (unit.type.isVespene) {
        board.one("·", x - 4, y - 4, 9, 9);
      }
    }
  }

  if (!filter || filter.resources) {
    for (const unit of Units.resources().values()) {
      const x = Math.floor(unit.body.x);
      const y = Math.floor(unit.body.y);

      if (unit.type.isMinerals) {
        board.one("M", x - 1, y, 2, 1);
      } else if (unit.type.isVespene) {
        board.one("V", x - 1, y - 1, 3, 3);
      } else {
        board.one("?", x, y, 1, 1);
      }
    }
  }

  if (!filter || filter.obstacles) {
    for (const unit of Units.obstacles().values()) {
      board.one("X", Math.floor(unit.body.x) - 1, Math.floor(unit.body.y) - 1, 3, 3);
    }
  }

  if (!filter || filter.depots) {
    for (const depot of Depot.list()) {
      board.one("N", Math.floor(depot.x - 2.5), Math.floor(depot.y - 2.5), 5, 5);
    }
  }

  if (!filter || filter.hubs) {
    for (const hub of Hub.list()) {
      const size = hub.r + hub.r;

      board.one("H", Math.floor(hub.x - hub.r), Math.floor(hub.y - hub.r), size, size);

      for (const pylon of hub.pylonPlots) {
        board.one("P", pylon.x - 1, pylon.y - 1, 2, 2);
      }
      for (const building of hub.buildingPlots) {
        board.one("B", building.x - 1.5, building.y - 1.5, 3, 3);
      }
    }
  }

  if (!filter || filter.zones) {
    for (const zone of Zone.list()) {
      board.one("O", Math.floor(zone.x), Math.floor(zone.y), 1, 1);
    }
  }

  return board;
}

export default new Map();
