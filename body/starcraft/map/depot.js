import Board from "./board.js";
import Zone from "./zone.js";

const depots = [];

export default class Depot extends Zone {

  // Home base is the first zone with depot building
  static home = null;

  isDepot = true;
  isPassage = true;

  // The depot building of this zone
  depot = null;
  plot = new Set();

  // Harvest resources
  minerals = new Set();
  vespene = new Set();
  extractors = new Set();

  constructor(name, center, cells, border, resources, depot) {
    super(name, center, cells, border);

    this.x = center.x + 0.5;
    this.y = center.y + 0.5;

    for (let x = center.x - 3; x <= center.x + 3; x++) {
      for (let y = center.y - 3; y <= center.y + 3; y++) {
        this.plot.add(Board.cell(x, y));
      }
    }

    for (const resource of resources) {
      const dx = resource.body.x - center.x;
      const dy = resource.body.y - center.y;

      resource.d = Math.sqrt(dx * dx + dy * dy);

      if (resource.type.isMinerals) {
        this.minerals.add(resource);
      } else if (resource.type.isVespene) {
        this.vespene.add(resource);
      }
    }

    this.harvestRally = findRally(center, this.minerals);
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

  static list() {
    return depots;
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
