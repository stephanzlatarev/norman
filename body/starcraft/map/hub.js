import Zone from "./zone.js";

const hubs = [];

export default class Hub extends Zone {

  constructor(x, y, r) {
    super(x, y, r);

    this.isPowered = false;

    this.pylonPlots = [
      { x: x    , y: y    , isFree: true },
      { x: x    , y: y + 2, isFree: true },
      { x: x + 2, y: y    , isFree: true },
      { x: x + 2, y: y + 2, isFree: true },
    ];

    this.buildingPlots = [
      { x: x - 2.5, y: y - 2.5, isFree: true },
      { x: x - 2.5, y: y + 0.5, isFree: true },
      { x: x + 0.5, y: y - 2.5, isFree: true },
    ];

    hubs.push(this);
  }

  remove() {
    const index = hubs.indexOf(this);

    if (index >= 0) {
      hubs.splice(index, 1);
    }
  }

  static list() {
    return hubs;
  }

  static order() {
    hubs.sort(function(a, b) {
      if (a.isWall !== b.isWall) return a.isWall ? -1 : 1;

      return a.d - b.d;
    });
  }

}
