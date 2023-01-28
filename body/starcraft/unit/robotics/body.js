import Unit from "../body.js";

export default class Robotics extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("build-observer")) {
      super.command(977, null, null, "build-observer");
      this.node.clear("build-observer");
    }

    await super.tock();
  }

}
