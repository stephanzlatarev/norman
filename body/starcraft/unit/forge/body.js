import Unit from "../body.js";

export default class Forge extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("research-armor")) {
      super.command(3694, null, null, "research-armor");
      this.node.clear("research-armor");
    } else if (this.node.get("research-weapons")) {
      super.command(3695, null, null, "research-weapons");
      this.node.clear("research-weapons");
    } else if (this.node.get("research-shields")) {
      super.command(3696, null, null, "build-shields");
      this.node.clear("research-shields");
    }

    await super.tock();
  }

}
