import Pin from "./pin.js";

export default class Corner extends Pin {

  distances = new Map();

  distanceTo(cell) {
    let distance = this.distances.get(cell);

    if (!distance) {
      distance = calculateDistance(this.cell, cell);

      if (this.distances.size < 100) {
        this.distances.set(cell, distance);
      } else {
        console.log("WARNING: Clearing corner distance cache");
        this.distances.clear();
      }
    }

    return distance;
  }

}

function calculateDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}
