import Pin from "./pin.js";

export default class Corner extends Pin {

  // Temporarily calculate distance based on distances between zones
  distanceTo(cell) {
    return this.cell.zone.distance.get(cell.zone);
  }

}
