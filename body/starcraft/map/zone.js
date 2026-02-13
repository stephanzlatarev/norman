import Space from "./space.js";

const zones = [];

export default class Zone extends Space {

  cells = new Set();
  border = new Set();
  sectors = new Set();
  horizon = new Set();

  // Maps neighboring zone to exit corridor
  neighbors = new Set();
  exits = new Map();

  constructor(name, center, cells, border) {
    super("zone");

    this.cell = center;
    this.x = center.x;
    this.y = center.y;
    this.z = center.z;

    this.name = name;
    this.cells = cells;
    this.border = border || new Set();
    this.rally = center;

    // The sectors of the zone include all sectors that contain its cells
    for (const cell of cells) {
      this.sectors.add(cell.sector);
      cell.zone = this;
    }

    // The horizon of the zone includes all sectors in the zone and their neighbors
    for (const sector of this.sectors) {
      this.horizon.add(sector);
      for (const neighbor of sector.neighbors) {
        this.horizon.add(neighbor);
      }
    }

    zones.push(this);
  }

  threats() {
    const threats = new Set();

    for (const sector of this.sectors) {
      for (const threat of sector.threats) {
        if (threat.zone && (threat.zone === this)) {
          threats.add(threat);
        }
      }
    }

    return threats;
  }

  static list() {
    return [...zones];
  }

  static order() {
    zones.sort((a, b) => (a.perimeterLevel - b.perimeterLevel));
  }

}
