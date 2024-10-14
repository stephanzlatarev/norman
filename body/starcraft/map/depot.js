import Zone from "./zone.js";
import GameMap from "./map.js";

const depots = [];

export default class Depot extends Zone {

  isDepot = true;

  // The depot building of this zone
  depot = null;

  minerals = new Set();
  vespene = new Set();
  extractors = new Set();

  constructor(cell, resources) {
    super(cell, cell.margin);

    this.x = cell.x + 0.5;
    this.y = cell.y + 0.5;

    for (const resource of resources) {
      const dx = resource.body.x - cell.x;
      const dy = resource.body.y - cell.y;

      resource.d = Math.sqrt(dx * dx + dy * dy);

      if (resource.type.isMinerals) {
        this.minerals.add(resource);
      } else if (resource.type.isVespene) {
        this.vespene.add(resource);
      }

      const rcell = GameMap.cell(resource.body.x, resource.body.y);
      if (rcell.area !== cell.area) {
        rcell.area.cells.delete(rcell);
        cell.area.cells.add(rcell);
      }
    }

    this.harvestRally = findRally(cell, this.minerals);
    this.exitRally = GameMap.cell(this.x + this.x - this.harvestRally.x, this.y + this.y - this.harvestRally.y);

    depots.push(this);
  }

  addUnit(unit) {
    super.addUnit(unit);

    if (unit.isOwn) {
      if (unit.type.isDepot && (unit.body.x === this.x) && (unit.body.y === this.y)) {
        this.depot = unit;
      } else if (unit.type.isExtractor) {
        if (unit.isActive) {
          this.extractors.add(unit);
        } else {
          this.extractors.delete(unit);
        }
      }
    } else if (unit.isEnemy) {
      // Ignore it.
    } else if (unit.type.isMinerals) {
      this.minerals.add(unit);
    } else if (unit.type.isVespene) {
      this.vespene.add(unit);
    }
  }

  removeUnit(unit) {
    super.removeUnit(unit);

    if (unit.type.isDepot && (unit.body.x === this.x) && (unit.body.y === this.y)) {
      this.depot = null;
    } else if (unit.type.isMinerals) {
      this.minerals.delete(unit);
    } else if (unit.type.isVespene) {
      this.vespene.delete(unit);
    } else if (unit.type.isExtractor) {
      this.extractors.delete(unit);
    }
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

function findRally(cell, resources) {
  let sumx = 0;
  let sumy = 0;

  for (const one of resources) {
    sumx += one.body.x;
    sumy += one.body.y;
  }

  const dx = Math.sign(Math.floor(sumx / resources.size) - cell.x);
  const dy = Math.sign(Math.floor(sumy / resources.size) - cell.y);

  return GameMap.cell(cell.x + dx * 3 + 0.5, cell.y + dy * 3 + 0.5);
}

export function createDepots(board, resources, base) {
  const coordinates = new Map();
  const covered = new Set();

  for (const resource of resources) {
    populateDepotCoordinates(coordinates, resource);
  }

  const candidates = [...coordinates.keys()].filter(a => (coordinates.get(a).length > 5)).sort((a, b) => (coordinates.get(b).length - coordinates.get(a).length));

  for (const one of candidates) {
    const resources = coordinates.get(one);

    if (resources.find(resource => !!covered.has(resource))) continue;

    const cell = getCellAtCoordinatesKey(board, one);

    if (cell.margin >= 3) {
      const depot = new Depot(cell, resources);

      cell.area.zone = depot;

      for (const resource of resources) {
        covered.add(resource);
      }

      if ((base.body.x === depot.x) && (base.body.y === depot.y)) {
        depot.depot = base;
      }

      for (let x = cell.x - 5; x <= cell.x + 5; x++) {
        for (let y = cell.y - 5; y <= cell.y + 5; y++) {
          const plot = board.cells[y][x];

          if (plot.isPath && (plot.area !== cell.area)) {
            if (plot.area) plot.area.cells.delete(plot);
            cell.area.cells.add(plot);
            plot.area = cell.area;
          }
        }
      }
    }
  }

}

function populateDepotCoordinates(coordinates, resource) {
  const list = [];

  if (resource.type.isMinerals) {
    for (let x = resource.body.x - 6; x <= resource.body.x + 4; x++) {
      list.push(getCoordinatesKey(x, resource.body.y - 7));
      list.push(getCoordinatesKey(x, resource.body.y - 6));
      list.push(getCoordinatesKey(x, resource.body.y + 6));
      list.push(getCoordinatesKey(x, resource.body.y + 7));
    }
    for (let y = resource.body.y - 5; y <= resource.body.y + 5; y++) {
      list.push(getCoordinatesKey(resource.body.x - 8, y));
      list.push(getCoordinatesKey(resource.body.x - 7, y));
      list.push(getCoordinatesKey(resource.body.x + 6, y));
      list.push(getCoordinatesKey(resource.body.x + 7, y));
    }
    list.push(getCoordinatesKey(resource.body.x - 6, resource.body.y - 5));
    list.push(getCoordinatesKey(resource.body.x - 6, resource.body.y + 5));
    list.push(getCoordinatesKey(resource.body.x + 5, resource.body.y - 5));
    list.push(getCoordinatesKey(resource.body.x + 5, resource.body.y + 5));
  } else {
    for (let x = resource.body.x - 7; x <= resource.body.x + 7; x++) {
      list.push(getCoordinatesKey(x, resource.body.y - 7));
      list.push(getCoordinatesKey(x, resource.body.y + 7));
    }
    for (let y = resource.body.y - 6; y <= resource.body.y + 6; y++) {
      list.push(getCoordinatesKey(resource.body.x - 7, y));
      list.push(getCoordinatesKey(resource.body.x + 7, y));
    }
  }

  for (const one of list) {
    let resources = coordinates.get(one);

    if (!resources) {
      resources = [];
      coordinates.set(one, resources);
    }

    resources.push(resource);
  }
}

function getCoordinatesKey(x, y) {
  return Math.floor(x) * 1000 + Math.floor(y);
}

function getCellAtCoordinatesKey(board, key) {
  const x = Math.floor(key / 1000);
  const y = Math.floor(key - x * 1000);

  return board.cells[y][x];
}
