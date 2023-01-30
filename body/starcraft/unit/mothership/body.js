import Unit from "../body.js";

export default class Mothership extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("time-warp")) {
      const location = this.node.get("time-warp");
      const locationX = location.get("x");
      const locationY = location.get("y");

      super.command(2244, null, { x: locationX, y: locationY }, "time-warp");
    }

    await super.tock();
  }

}
