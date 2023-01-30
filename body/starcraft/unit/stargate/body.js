import Unit from "../body.js";

export default class Stargate extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("build-phoenix")) {
      super.command(946, null, null, "build-phoenix");
      this.node.clear("build-phoenix");
    } else if (this.node.get("build-voidray")) {
      super.command(950, null, null, "build-voidray");
      this.node.clear("build-voidray");
    }

    await super.tock();
  }

}
