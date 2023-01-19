import Unit from "../body.js";

export default class Assimilator extends Unit {

  constructor(node) {
    super(node);

    node.set("utilized", false);
  }

  async tock() {
  }

}
