import Unit from "../body.js";

export default class Gateway extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("build-zealot")) {
      super.command(916, null, null, "build-zealot");
      this.node.clear("build-zealot");
    } else if (this.node.get("build-stalker")) {
      super.command(917, null, null, "build-stalker");
      this.node.clear("build-stalker");
    } else if (this.node.get("build-sentry")) {
      super.command(921, null, null, "build-sentry");
      this.node.clear("build-sentry");
    }

    await super.tock();
  }

}
