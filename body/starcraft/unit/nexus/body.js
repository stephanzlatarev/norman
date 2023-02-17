import Unit from "../body.js";

export default class Nexus extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (!this.hasSetRallyPoint) {
      super.command(3690, null, { x: this.node.get("resources/x"), y: this.node.get("resources/y")});
      this.hasSetRallyPoint = true;
    }

    if (this.node.get("build-probe")) {
      super.command(1006, null, null, "build-probe");
      this.node.clear("build-probe");
    } else if (this.node.get("build-mothership")) {
      super.command(110, null, null, "build-mothership");
      this.node.clear("build-mothership");
    }

    if (this.node.get("chronoboost")) {
      super.command(3755, this.node.get("chronoboost").get("tag"), null, "chronoboost");
    }

    await super.tock();
  }

}
