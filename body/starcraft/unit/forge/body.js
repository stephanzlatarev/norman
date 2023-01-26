import Unit from "../body.js";

export default class Forge extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("research-armor")) {
      if (super.command(3694, null, null, "research-armor")) {
        this.node.set("armor-level", 1);
      }
    } else if (this.node.get("research-weapons")) {
      if (super.command(3695, null, null, "research-weapons")) {
        this.node.set("weapons-level", 1);
      }
    } else if (this.node.get("research-shields")) {
      if (super.command(3696, null, null, "build-shields")) {
        this.node.set("shields-level", 1);
      }
    }

    await super.tock();
  }

}
