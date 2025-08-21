import Board from "./board.js";
import Units from "../units.js";
import Zone from "./zone.js";

const depots = [];

export default class Depot extends Zone {

  static DEPOT_VISION_RANGE = 12;

  // Home base is the first zone with depot building
  static home = null;

  isDepot = true;

  // The depot building of this zone
  depot = null;

  plot = new Set();
  minerals = new Set();
  vespene = new Set();
  extractors = new Set();

  constructor(cell, resources, depot) {
    super(cell);

    this.x = cell.x + 0.5;
    this.y = cell.y + 0.5;

    for (let x = cell.x - 2; x <= cell.x + 2; x++) {
      for (let y = cell.y - 2; y <= cell.y + 2; y++) {
        this.plot.add(Board.cell(x, y));
      }
    }

    for (const resource of resources) {
      const dx = resource.body.x - cell.x;
      const dy = resource.body.y - cell.y;

      resource.d = Math.sqrt(dx * dx + dy * dy);

      if (resource.type.isMinerals) {
        this.minerals.add(resource);
      } else if (resource.type.isVespene) {
        this.vespene.add(resource);
      }

      const rcell = Board.cell(resource.body.x, resource.body.y);
      if (rcell.area !== cell.area) {
        rcell.area.cells.delete(rcell);
        cell.area.cells.add(rcell);
      }
    }

    this.harvestRally = findRally(cell, this.minerals);
    this.rally = Board.cell(
      this.x + this.x - this.harvestRally.x - 1,
      this.y + this.y - this.harvestRally.y - 1
    );
    this.exitRally = this.rally;

    if (depot && !Depot.home) {
      this.depot = depot;
      Depot.home = this;
    }

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

  const dx = resources.size ? Math.sign(Math.floor(sumx / resources.size) - cell.x) : 1;
  const dy = resources.size ? Math.sign(Math.floor(sumy / resources.size) - cell.y) : 1;

  return Board.cell(cell.x + dx * 3 + 0.5, cell.y + dy * 3 + 0.5);
}

export function createDepots() {
  const coordinates = new Map();

  for (const building of Units.buildings().values()) {
    if (building.type.isDepot) {
      addToDepotCoordinates(building, coordinates, "depots", [getCoordinatesKey(building.body.x, building.body.y)]);
    }
  }

  for (const resource of Units.resources().values()) {
    populateDepotCoordinates(coordinates, resource);
  }

  const candidates = selectDepotCoordinates(coordinates);

  for (const candidate of candidates) {
    new Depot(candidate.cell, candidate.resources, candidate.depot).expand(Depot.DEPOT_VISION_RANGE, true);
  }

}

function isDepotBuildingPlot(cell) {
  for (let x = cell.x - 3; x <= cell.x + 3; x++) {
    for (let y = cell.y - 3; y <= cell.y + 3; y++) {
      const cell = Board.cell(x, y);

      if (!cell || cell.isObstructed()) {
        return false;
      }
    }
  }

  return true;
}

function populateDepotCoordinates(coordinates, resource) {
  const normalMinerals = [];
  const normalVespene = [];
  const richMinerals = [];
  const richVespene = [];

  if (resource.type.isMinerals) {
    const minerals = resource.type.isRich ? richMinerals : normalMinerals;

    for (let x = resource.body.x - 6; x <= resource.body.x + 4; x++) {
      minerals.push(getCoordinatesKey(x, resource.body.y - 7));
      minerals.push(getCoordinatesKey(x, resource.body.y - 6));
      minerals.push(getCoordinatesKey(x, resource.body.y + 6));
      minerals.push(getCoordinatesKey(x, resource.body.y + 7));
    }
    for (let y = resource.body.y - 5; y <= resource.body.y + 5; y++) {
      minerals.push(getCoordinatesKey(resource.body.x - 8, y));
      minerals.push(getCoordinatesKey(resource.body.x - 7, y));
      minerals.push(getCoordinatesKey(resource.body.x + 6, y));
      minerals.push(getCoordinatesKey(resource.body.x + 7, y));
    }
    minerals.push(getCoordinatesKey(resource.body.x - 6, resource.body.y - 5));
    minerals.push(getCoordinatesKey(resource.body.x - 6, resource.body.y + 5));
    minerals.push(getCoordinatesKey(resource.body.x + 5, resource.body.y - 5));
    minerals.push(getCoordinatesKey(resource.body.x + 5, resource.body.y + 5));
  } else {
    const vespene = resource.type.isRich ? richVespene : normalVespene;

    for (let x = resource.body.x - 7; x <= resource.body.x + 7; x++) {
      vespene.push(getCoordinatesKey(x, resource.body.y - 7));
      vespene.push(getCoordinatesKey(x, resource.body.y + 7));
    }
    for (let y = resource.body.y - 6; y <= resource.body.y + 6; y++) {
      vespene.push(getCoordinatesKey(resource.body.x - 7, y));
      vespene.push(getCoordinatesKey(resource.body.x + 7, y));
    }
  }

  addToDepotCoordinates(resource, coordinates, "normalMinerals", normalMinerals);
  addToDepotCoordinates(resource, coordinates, "normalVespene", normalVespene);
  addToDepotCoordinates(resource, coordinates, "richMinerals", richMinerals);
  addToDepotCoordinates(resource, coordinates, "richVespene", richVespene);
}

function addToDepotCoordinates(resource, coordinates, type, list) {
  for (const key of list) {
    let resources = coordinates.get(key);

    if (!resources) {
      resources = { depots: [], normalMinerals: [], normalVespene: [], richMinerals: [], richVespene: [] };
      coordinates.set(key, resources);
    }

    resources[type].push(resource);
  }
}

function selectDepotCoordinates(coordinates) {
  const depots = [];

  for (const [key, resources] of coordinates) {
    const cell = getCellAtCoordinatesKey(key);

    let isDepotLocation = false;

    if (resources.depots.length) {
      isDepotLocation = true;
    } else if (isDepotBuildingPlot(cell)) {
      const minerals = resources.normalMinerals.length + resources.richMinerals.length * 7 / 5;
      const vespene = resources.normalVespene.length + resources.richVespene.length * 2;

      if ((minerals >= 8) && (vespene >= 2)) {
        isDepotLocation = true;
      }
    }

    if (isDepotLocation) {
      depots.push({
        cell,
        depot: resources.depots[0],
        resources: [...resources.normalMinerals, ...resources.normalVespene, ...resources.richMinerals, ...resources.richVespene],
      });
    }
  }

  return depots;
}

function getCoordinatesKey(x, y) {
  return Math.floor(x) * 1000 + Math.floor(y);
}

function getCellAtCoordinatesKey(key) {
  const x = Math.floor(key / 1000);
  const y = Math.floor(key - x * 1000);

  return Board.cells[y][x];
}
