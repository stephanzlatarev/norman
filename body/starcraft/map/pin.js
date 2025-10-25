import Board from "./board.js";

const SECTOR_NAME_COLS = "ABCDEFGHIJ";
const SECTOR_NAME_ROWS = "0123456789";

export default class Pin {

  constructor(cell) {
    this.cell = cell;
    this.x = cell.x;
    this.y = cell.y;
    this.sector = getSectorName(this.x, this.y);

    this.d = 1;
  }

  toString() {
    return `${this.sector} (${this.x.toFixed(1)}:${this.y.toFixed(1)})`;
  }

}

function getSectorName(x, y) {
  const boxx = 10 / (Board.right - Board.left);
  const boxy = 10 / (Board.bottom - Board.top);
  const row = Math.floor((y - Board.top) * boxy);
  const col = Math.floor((x - Board.left) * boxx);

  return SECTOR_NAME_COLS[col] + SECTOR_NAME_ROWS[row];
}
