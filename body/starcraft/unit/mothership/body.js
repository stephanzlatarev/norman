import Unit from "../body.js";

export default class Mothership extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    await super.tock();
  }

}
