import Unit from "../body.js";

export default class Cybernetics extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("research-armor")) {
      super.command(3692, null, null, "research-armor");
      this.node.clear("research-armor");
    } else if (this.node.get("research-weapons")) {
      super.command(3693, null, null, "research-weapons");
      this.node.clear("research-weapons");
    }

    await super.tock();
  }

}
