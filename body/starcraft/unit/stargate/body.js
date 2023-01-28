import Unit from "../body.js";

export default class Stargate extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("build-phoenix")) {
      super.command(946, null, null, "build-phoenix");
      this.node.clear("build-phoenix");
    }

    await super.tock();
  }

}
