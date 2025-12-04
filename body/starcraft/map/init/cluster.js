
export default class Cluster {

  cells = new Set();
  isEmpty = true;

  isAir = false;
  isCurtain = false;
  isDepot = false;
  isGround = false;
  isRamp = false;
  isPatch = false;

  constructor(cells) {
    for (const cell of cells) {
      this.add(cell);
    }
  }

  add(cell) {
    if (cell.cluster === this) return this;

    if (cell.cluster) {
      cell.cluster.cells.delete(cell);

      if (!cell.cluster.cells.size) {
        cell.cluster.empty();
        cell.isEmpty = true;
      }
    }

    this.cells.add(cell);
    this.isEmpty = false;

    cell.cluster = this;

    return this;
  }

  derive(cells) {
    const isAir = this.isAir;
    const isCurtain = this.isCurtain;
    const isDepot = this.isDepot;
    const isGround = this.isGround;
    const isRamp = this.isRamp;
    const isPatch = this.isPatch;

    const cluster = new Cluster(cells);

    cluster.isAir = isAir;
    cluster.isCurtain = isCurtain;
    cluster.isDepot = isDepot;
    cluster.isGround = isGround;
    cluster.isRamp = isRamp;
    cluster.isPatch = isPatch;

    return cluster;
  }

  empty() {
    this.cells.clear();
    this.isEmpty = true;

    this.isAir = false;
    this.isCurtain = false;
    this.isDepot = false;
    this.isGround = false;
    this.isRamp = false;
    this.isPatch = false;

    return this;
  }

  setCenter(x, y) {
    this.x = x;
    this.y = y;

    return this;
  }

  setAir() {
    if (this.isEmpty) return this;

    this.isAir = true;
    this.isCurtain = false;
    this.isDepot = false;
    this.isGround = false;
    this.isRamp = false;
    this.isPatch = false;

    return this;
  }

  setCurtain() {
    if (this.isEmpty) return this;

    this.isAir = false;
    this.isCurtain = true;
    this.isDepot = false;
    this.isGround = false;
    this.isRamp = false;
    this.isPatch = false;

    return this;
  }

  setDepot() {
    if (this.isEmpty) return this;

    this.isAir = false;
    this.isCurtain = false;
    this.isDepot = true;
    this.isGround = false;
    this.isRamp = false;
    this.isPatch = false;

    return this;
  }

  setGround() {
    if (this.isEmpty) return this;

    this.isAir = false;
    this.isCurtain = false;
    this.isDepot = false;
    this.isGround = true;
    this.isRamp = false;
    this.isPatch = false;

    return this;
  }

  setRamp() {
    if (this.isEmpty) return this;

    this.isAir = false;
    this.isCurtain = false;
    this.isDepot = false;
    this.isGround = false;
    this.isRamp = true;
    this.isPatch = false;

    return this;
  }

  setPatch() {
    if (this.isEmpty) return this;

    this.isAir = false;
    this.isCurtain = false;
    this.isDepot = false;
    this.isGround = false;
    this.isRamp = false;
    this.isPatch = true;

    return this;
  }

}
