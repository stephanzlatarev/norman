import Unit from "../body.js";

export default class Phoenix extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    await super.tock();
  }

}
