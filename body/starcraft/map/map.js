import { RESOURCES } from "../units.js";

const DIMENSIONS = {
  149: { w: 2, h: 2 }, // Xel'Naga Tower
  364: { w: 4, h: 4 },
  365: { w: 6, h: 6 },
  372: { w: 4, h: 4 },
  377: { w: 4, h: 4 },
  472: { w: 4, h: 4 },
  629: { w: 6, h: 6 },
  638: { w: 14, h: 4 },
  639: { w: 16, h: 6 },
  640: { w: 4, h: 4 },
  643: { w: 10, h: 2 },
  472: { w: 4, h: 4 },
  474: { w: 4, h: 4 },
};

const NEUTRAL_MOVING_UNIT = {
  336: "dog",
  612: "bot",
};

export default class Map {

  constructor(gameInfo, observation) {
    this.units = observation.rawData.units.filter(unit => (unit.owner !== 1) && (unit.owner !== 2)).map(unit => ({
      tag: unit.tag,
      type: RESOURCES[unit.unitType],
      unitType: unit.unitType,
      x: unit.pos.x,
      y: unit.pos.y,
    }));

    this.lines = [];

    const size = gameInfo.startRaw.placementGrid.size;
    const grid = gameInfo.startRaw.placementGrid.data;
    for (let y = 0; y < size.y; y++) {
      const line = [];
      for (let x = 0; x < size.x; x++) {
        const index = x + y * size.x;
        const bit = grid[Math.floor(index / 8)];
        const pos = 7 - index % 8;
        const mask = 1 << pos;
        const val = (bit & mask) != 0;

        if (val) {
          line.push(" ");
        } else {
          line.push("-");
        }
      }
      this.lines.push(line.join(""));
    }

    const minerals = this.units.filter(unit => (unit.type === "mineral"));
    const vespenes = this.units.filter(unit => (unit.type === "vespene"));

    this.clusters = clusterResources(findClusters(minerals, vespenes));
    this.nexuses = this.clusters.map(cluster => findNexusLocation(this, cluster));
    this.bases = findBasePlots(this, 10);
  }

  map(filter) {
    const map = JSON.parse(JSON.stringify(this.lines));

    if (!filter || filter.harvest) {
      for (const unit of this.units) {
        const type = RESOURCES[unit.unitType];
        const x = Math.floor(unit.x);
        const y = Math.floor(unit.y);

        if (type === "mineral") {
          add(map, "·", x - 4, y - 2, 8, 5);
          add(map, "·", x - 3, y - 3, 6, 7);
        } else if (type === "vespene") {
          add(map, "·", x - 4, y - 4, 9, 9);
        }
      }
    }

    if (this.units && (!filter || filter.units)) {
      for (const unit of this.units) {
        const type = RESOURCES[unit.unitType];
        const dimensions = DIMENSIONS[unit.unitType];
        const x = Math.floor(unit.x);
        const y = Math.floor(unit.y);

        if (type === "mineral") {
          add(map, "M", x - 1, y, 2, 1);
        } else if (type === "vespene") {
          add(map, "M", x - 1, y - 1, 3, 3);
        } else if (dimensions) {
          add(map, "X", Math.floor(x - dimensions.w / 2), Math.floor(y - dimensions.h / 2), dimensions.w, dimensions.h);
        } else if (!NEUTRAL_MOVING_UNIT[unit.unitType]) {
          add(map, "?", x - 2, y - 2, 4, 4);
        }
      }
    }

    if (this.bases && (!filter || filter.bases)) {
      for (const base of this.bases) {
        if (base && base.x && base.y && base.w && base.h) {
          add(map, "|", base.x, base.y, base.w, base.h);
        }
      }
    }

    if (this.nexuses && (!filter || filter.nexuses)) {
      for (const nexus of this.nexuses) {
        add(map, "N", Math.floor(nexus.x - 2.5), Math.floor(nexus.y - 2.5), 5, 5);
      }
    }

    if (this.clusters && (!filter || filter.clusters)) {
      for (const cluster of this.clusters) {
        add(map, "O", Math.floor(cluster.x), Math.floor(cluster.y), 1, 1);
      }
    }

    return map;
  }

  prefix(map, x, y, w, h) {
    const minx = x ? x : 0;
    const maxx = w ? minx + w : map[0].length - 1;
    const miny = y ? y : 0;
    const maxy = h ? miny + h : map.length - 1;

    // Zero prefix table
    const prefix = [];
    for (const row of map) {
      const line = [];
      for (const _ of row) {
        line.push({ w: 0, h: 0 });
      }
      prefix.push(line);
    }

    for (let row = Math.min(maxy - 1, map.length - 1); row >= Math.max(miny, 0); row--) {
      for (let col = Math.min(maxx - 1, map[row].length - 1); col >= Math.max(minx, 0); col--) {
        if (map[row][col] !== " ") continue;

        const cell = prefix[row][col];
        const right = prefix[row][col + 1];
        const bottom = prefix[row + 1][col];
        const diagonal = prefix[row + 1][col + 1];

        cell.w = Math.min(right.w + 1, diagonal.w + 1);
        cell.h = Math.min(bottom.h + 1, diagonal.h + 1);
      }
    }

    return prefix;
  }

  plot(prefix, width, height, minX, minY, maxX, maxY, centerX, centerY) {
    let best = 1000000;
    let plot = { x:0, y: 0, w: 0, h: 0 };

    for (let y = Math.max(minY, 0); y <= Math.min(maxY, prefix.length - 1); y++) {
      for (let x = Math.max(minX, 0); x <= Math.min(maxX, prefix[y].length - 1); x++) {
        const cell = prefix[y][x];

        if ((cell.w >= width) && (cell.h >= height)) {
          const cellCenterX = x + width / 2;
          const cellCenterY = y + height / 2;
          const distance = (cellCenterX - centerX) * (cellCenterX - centerX) + (cellCenterY - centerY) * (cellCenterY - centerY);

          if (distance < best) {
            best = distance;
            plot = { x: x, y: y, w: cell.w, h: cell.h };
          }
        }
      }
    }

    return { x: plot.x, y: plot.y, w: width, h: height };
  }
}

function add(map, symbol, x, y, w, h) {
  for (let row = y; row < y + h; row++) {
    const line = map[row];

    let symbols = "";
    for (let i = 0; i < w; i++) symbols += symbol;

    map[row] = line.substring(0, x) + symbols + line.substring(x + w);
  }
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
      if (resource.type === "mineral") {
        minX = Math.min(minX, resource.x);
        maxX = Math.max(maxX, resource.x);
        minY = Math.min(minY, resource.y);
        maxY = Math.max(maxY, resource.y);
      }
    }

    const x = (maxX + minX) / 2;
    const y = (maxY + minY) / 2;

    result.push({
      index: index++,
      resources: cluster,
      x: Math.floor(x),
      y: Math.floor(y),
    });
  }

  return result;
}

function findClusters(minerals, vespenes) {
  let clusters = [];

  for (const resource of minerals) {
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
    for (const resource of vespenes) {
      if (isResourceInCluster(resource, cluster, 10)) {
        cluster.push(resource);
      }
    }
  }

  return clusters;
}

function isResourceInCluster(resource, cluster, distance) {
  for (const object of cluster) {
    if ((Math.abs(object.x - resource.x) < distance) && (Math.abs(object.y - resource.y) < distance)) {
      return true;
    }
  }

  return false;
}

function findNexusLocation(map, cluster) {
  const clusterX = Math.floor(cluster.x);
  const clusterY = Math.floor(cluster.y);
  const plotMinX = clusterX - 20;
  const plotMinY = clusterY - 20;
  const plotMaxW = 40;
  const plotMaxH = 40;
  const data = map.prefix(map.map({ harvest: 1, units: 1 }), plotMinX, plotMinY, plotMaxW, plotMaxH);
  const slot = map.plot(data, 5, 5, plotMinX, plotMinY, plotMinX + plotMaxW, plotMinY + plotMaxH, clusterX, clusterY);

  cluster.nexus = { x: slot.x + 2.5, y: slot.y + 2.5 };

  // Move cluster center to be just outside the nexus
  cluster.x = cluster.nexus.x + Math.sign(cluster.x - cluster.nexus.x) * 3;
  cluster.y = cluster.nexus.y + Math.sign(cluster.y - cluster.nexus.y) * 3;

  return cluster.nexus;
}

function findBasePlots(map, size) {
  const plots = [];
  const board = map.map({ nexuses: 1, units: 1 });

  for (let y = 0; y < board.length - size; y += size) {
    for (let x = 0; x < board[y].length - size; x += size) {
      const data = map.prefix(board, x, y, size + size, size + size);
      const plot = findPlot(plots.length, data, x, y, x + size + size, y + size + size, size, size);

      if (plot) {
        plots.push(plot);
        add(board, "X", plot.x, plot.y, plot.w, plot.h);
      }
    }
  }

  return plots;
}

function findPlot(index, prefix, startX, startY, endX, endY, width, height) {
  for (let y = startY; y < Math.min(endY, prefix.length - 1); y++) {
    for (let x = startX; x < Math.min(endX, prefix[y].length - 1); x++) {
      const cell = prefix[y][x];

      if (cell && (cell.w >= width) && (cell.h >= height)) {
        return { index: index, x: x, y: y, w: width, h: height };
      }
    }
  }
}
