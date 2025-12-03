import Space from "./space.js";

const SECTOR_NAME_COLS = "ABCDEFGHIJ";
const SECTOR_NAME_ROWS = "0123456789";

const sectors = [];
const knownThreats = new Map();

export default class Sector extends Space {

  cells = new Set();
  neighbors = new Set();

  // Units
  threats = new Set();

  constructor(row, col) {
    super("sector");

    this.row = row;
    this.col = col;

    this.name = SECTOR_NAME_COLS[col] + SECTOR_NAME_ROWS[row];

    sectors.push(this);
  }

  addUnit(unit) {
    updateThreats(this, unit);

    super.addUnit(unit);
  }

  clearThreat(threat) {
    this.threats.delete(threat);
  }

  static list() {
    return sectors;
  }

}

function updateThreats(sector, unit) {
  if (!unit.isEnemy) return;
  if (!unit.isVisible) return;
  if (unit.isHallucination) return;

  // Update known threats
  const knownThreat = knownThreats.get(unit.tag);

  if (knownThreat && (knownThreat !== unit)) {
    // The known threat image is outdated
    knownThreat.sector.clearThreat(knownThreat);
  }

  knownThreats.set(unit.tag, unit);

  // Update sector threats
  if (unit.sector && (unit.sector !== sector)) {
    // The unit moved to a different sector
    unit.sector.clearThreat(unit);
  }

  sector.threats.add(unit);
}
