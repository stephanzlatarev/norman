import Zone from "./zone.js";

export default class Corridor extends Zone {

  constructor(x, y, r) {
    super(x, y, r);

    this.zones = [];
    this.wall = null;
  }

}
