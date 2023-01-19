import Unit from "../body.js";

export default class Stalker extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    await super.tock();
  }

}
