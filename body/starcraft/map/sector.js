import Space from "./space.js";

const SECTOR_NAME_COLS = "ABCDEFGHIJ";
const SECTOR_NAME_ROWS = "0123456789";

const sectors = [];

export default class Sector extends Space {

  cells = new Set();
  neighbors = new Set();

  constructor(row, col) {
    super("sector");

    this.row = row;
    this.col = col;

    this.name = SECTOR_NAME_COLS[col] + SECTOR_NAME_ROWS[row];

    sectors.push(this);
  }

  static list() {
    return sectors;
  }

}
