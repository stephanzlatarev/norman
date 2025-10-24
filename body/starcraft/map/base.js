import Area from "./area.js";
import Corner from "./corner.js";
import Depot from "./depot.js";

const bases = new Map();

export default class Base extends Area {

  // Home base is our first owned depot area
  static home = null;

  // Expo base is the next depot area to expand to
  static expo = null;

  isBase = true;

  corners = [];

  constructor(cell) {
    super(cell);

    // TODO: Radius will soon be calculated based on vision of our units
    this.r = 11;
    // TODO: Calculate the corners for all areas
    this.corners.push(new Corner(cell));

    bases.set(cell, this);
  }

  remove() {
    super.remove();

    bases.delete(this.cell);
  }

  static list() {
    return [...bases.values()];
  }

}

export function syncBases() {
  for (const depot of Depot.list()) {
    if (depot.depot && !bases.has(depot.cell)) {
      new Base(depot.cell);
    }
  }
}
