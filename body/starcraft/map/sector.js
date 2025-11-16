import Pin from "./pin.js";

export default class Sector extends Pin {

  name = "00";

  cells = new Set();

  constructor(cell) {
    super(cell);
  }

}
