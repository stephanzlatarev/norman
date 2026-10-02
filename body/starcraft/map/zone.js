import Space from "./space.js";

const zones = [];

export default class Zone extends Space {

  cells = new Set();
  border = new Set();
  sectors = new Set();
  horizon = new Set();

  // Enclosing circle around the zone
  circle = null;

  // Maps neighboring zone to exit corridor
  neighbors = new Set();
  exits = new Map();

  // Route to home base
  distance = 0; // Distance from home base
  offset = 0;   // Distance from nearest base
  route = [];
  forward = new Set();
  backward = null;

  // Perimeter level
  perimeterLevel = Infinity;

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

    // The enclosing circle is an approximate smallest circle around the zone's border
    this.circle = enclosingCircle(this.border.size ? this.border : cells);

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

  contacts() {
    const contacts = new Set();

    for (const sector of this.sectors) {
      for (const contact of sector.contacts) {
        if (contact.zone && (contact.zone === this)) {
          contacts.add(contact);
        }
      }
    }

    return contacts;
  }

  static list() {
    return [...zones];
  }

  static order() {
    zones.sort((a, b) => (a.perimeterLevel - b.perimeterLevel));
  }

}

// Approximate smallest circle enclosing the given cells, using Ritter's algorithm
function enclosingCircle(cells) {
  let seed;
  for (const cell of cells) { seed = cell; break; }
  if (!seed) return { x: 0, y: 0, r: 0 };

  // Seed the circle on the diameter between the two mutually farthest-ish cells
  const a = farthestCell(cells, seed);
  const b = farthestCell(cells, a);

  let x = (a.x + b.x) / 2;
  let y = (a.y + b.y) / 2;
  let r = Math.sqrt(squareDistance(a, b)) / 2;

  // Grow the circle minimally for any cell that falls outside it
  for (const cell of cells) {
    const dx = cell.x - x;
    const dy = cell.y - y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d > r) {
      const nr = (r + d) / 2;
      const k = (nr - r) / d;

      x += dx * k;
      y += dy * k;
      r = nr;
    }
  }

  return { x, y, r };
}

function farthestCell(cells, from) {
  let farthest = from;
  let farthestDistance = -1;

  for (const cell of cells) {
    const distance = squareDistance(cell, from);

    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthest = cell;
    }
  }

  return farthest;
}

function squareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

