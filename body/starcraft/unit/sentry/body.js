import Unit from "../body.js";

export default class Sentry extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("scout")) {
      const thisX = this.node.get("x");
      const thisY = this.node.get("y");
      const location = this.node.get("scout");
      const locationX = location.get("x");
      const locationY = location.get("y");

      if ((Math.abs(thisX - locationX) >= 1) || (Math.abs(thisY - locationY) >= 1)) {
        super.command(16, null, { x: locationX, y: locationY }, "move");
      }
    } else if (this.node.get("use-guardian-shield")) {
      super.command(76, null, null, "use-guardian-shield");
    }

    await super.tock();
  }

}
