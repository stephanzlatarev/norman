import Zone from "./zone.js";

export default class Corridor extends Zone {

  isCorridor = true;

  constructor(x, y, r) {
    super(x, y, r);

    this.zones = [];
    this.wall = null;
  }

}
