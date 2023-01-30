import Unit from "../body.js";

export default class Carrier extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    await super.tock();
  }

}
