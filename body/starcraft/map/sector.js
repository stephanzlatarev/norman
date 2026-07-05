import Space from "./space.js";

const SECTOR_NAME_COLS = "ABCDEFGHIJ";
const SECTOR_NAME_ROWS = "0123456789";

const sectors = [];
const tracked = new Map();

export default class Sector extends Space {

  cells = new Set();
  neighbors = new Set();

  // Enemy units tracked regardless of fog of war.
  threats = new Set();  // Enemy warriors
  contacts = new Set(); // Non-warrior enemy units

  constructor(row, col) {
    super("sector");

    this.row = row;
    this.col = col;

    this.name = SECTOR_NAME_COLS[col] + SECTOR_NAME_ROWS[row];

    sectors.push(this);
  }

  addUnit(unit) {
    this.trackUnit(unit);
    super.addUnit(unit);
  }

  trackUnit(unit) {
    if (!unit.isValidShootingTarget(true)) return;

    const known = tracked.get(unit.tag);

    if (known && (known !== unit)) {
      // The known image is outdated
      known.sector.threats.delete(known);
      known.sector.contacts.delete(known);
    }

    if (unit.sector && (unit.sector !== this)) {
      // The unit moved to a different sector
      unit.sector.threats.delete(unit);
      unit.sector.contacts.delete(unit);
    }

    if (unit.type.isWarrior) {
      this.threats.add(unit);
    } else {
      this.contacts.add(unit);
    }

    tracked.set(unit.tag, unit);
  }

  untrackUnit(unit) {
    this.threats.delete(unit);
    this.contacts.delete(unit);
  }

  static list() {
    return sectors;
  }

}
