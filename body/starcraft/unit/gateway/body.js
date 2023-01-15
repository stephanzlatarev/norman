import Unit from "../body.js";

export default class Gateway extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("build-zealot")) {
      super.command(916, null, null, "build-zealot");
    }

    await super.tock();
  }

}
