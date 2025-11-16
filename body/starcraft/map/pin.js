
export default class Pin {

  constructor(cell, x, y) {
    this.cell = cell;

    this.x = x || cell.x || 0;
    this.y = y || cell.y || 0;
  }

  toString() {
    return `${this.cell.sector.name} (${this.x.toFixed(1)}:${this.y.toFixed(1)})`;
  }

}
