import Memory from "../../../code/memory.js";

export default class Pin extends Memory {

  constructor(location) {
    super();

    this.x = location.x;
    this.y = location.y;

    this.d = 1;
  }

}
