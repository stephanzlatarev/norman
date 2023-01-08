import Unit from "../body.js";

export default class Nexus extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("build-probe")) {
      super.command(1006, null, null, "build-probe");
    }
    if (this.node.get("chronoboost")) {
      super.command(3755, this.node.get("chronoboost").get("tag"), null, "chronoboost");
    }
    await super.tock();
  }

}
