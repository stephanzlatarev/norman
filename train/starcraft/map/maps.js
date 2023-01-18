import fs from "fs";

const MAPS_FILE = "./train/starcraft/map/maps.json";

const RESOURCES = { 
  146: "mineral", 147: "mineral", 341: "mineral", 483: "mineral",
  665: "mineral", 666: "mineral", 796: "mineral", 797: "mineral",
  884: "mineral", 885: "mineral", 886: "mineral", 887: "mineral",
  342: "vespene", 343: "vespene", 344: "vespene",
  608: "vespene", 880: "vespene", 881: "vespene",
};

export const MAP = "HardwireAIE";

export function read() {
  return JSON.parse(fs.readFileSync(MAPS_FILE));
}

export function resources() {
  const data = read()[MAP];
  return data.units.filter(unit => RESOURCES[unit.unitType]);
}

export function map(filter) {
  const data = read()[MAP];
  const map = JSON.parse(JSON.stringify(data.map));

  if (!filter || filter.harvest) {
    for (const unit of data.units) {
      const type = RESOURCES[unit.unitType];
      const x = Math.floor(unit.pos.x);
      const y = Math.floor(unit.pos.y);

      if (type === "mineral") {
        add(map, "·", x - 4, y - 2, 8, 5);
        add(map, "·", x - 3, y - 3, 6, 7);
      } else if (type === "vespene") {
        add(map, "·", x - 4, y - 4, 9, 9);
      }
    }
  }

  if (data.units && (!filter || filter.units)) {
    for (const unit of data.units) {
      const type = RESOURCES[unit.unitType];
      const x = Math.floor(unit.pos.x);
      const y = Math.floor(unit.pos.y);

      if (type === "mineral") {
        add(map, "M", x - 1, y, 2, 1);
      } else if (type === "vespene") {
        add(map, "M", x - 1, y - 1, 3, 3);
      } else {
        add(map, "?", x - 2, y - 2, 4, 4);
      }
    }
  }

  if (data.bases && (!filter || filter.bases)) {
    for (const base of data.bases) {
      if (base.x && base.y && base.w && base.h) {
        add(map, "|", base.x, base.y, base.w, base.h);
      }
    }
  }

  if (data.nexuses && (!filter || filter.nexuses)) {
    for (const nexus of data.nexuses) {
      add(map, "N", Math.floor(nexus.x - 2.5), Math.floor(nexus.y - 2.5), 5, 5);
    }
  }

  if (data.clusters && (!filter || filter.clusters)) {
    for (const cluster of data.clusters) {
      add(map, "O", Math.floor(cluster.x), Math.floor(cluster.y), 1, 1);
    }
  }

  return map;
}

export function store(data) {
  const maps = read();

  if (!maps[MAP]) maps[MAP] = {};

  for (const key in data) {
    maps[MAP][key] = data[key];
  }

  fs.writeFileSync(MAPS_FILE, JSON.stringify(maps, null, 2));

  console.log("Successfully updated map", MAP);
}

function add(map, symbol, x, y, w, h) {
  for (let row = y; row < y + h; row++) {
    const line = map[row];

    let symbols = "";
    for (let i = 0; i < w; i++) symbols += symbol;

    map[row] = line.substring(0, x) + symbols + line.substring(x + w);
  }
}

export function prefix(map, x, y, w, h) {
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

  for (let row = maxy - 1; row >= miny; row--) {
    for (let col = maxx - 1; col >= minx; col--) {
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

export function plot(prefix, width, height, minX, minY, maxX, maxY, centerX, centerY) {
  let best = 1000000;
  let plot = { x:0, y: 0, w: 0, h: 0 };

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
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
