import Pin from "./pin.js";

const areas = [];

export default class Area extends Pin {

  corners = [];

  constructor(cell) {
    super(cell);

    this.name = cell.zone.name; // TODO: Remove this when extending Zone

    areas.push(this);
  }

  remove() {
    super.remove();

    const index = areas.indexOf(this);

    if (index >= 0) {
      areas.splice(index, 1);
    }
  }

  static list() {
    return areas;
  }

}
