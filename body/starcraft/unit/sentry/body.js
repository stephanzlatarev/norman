import Unit from "../body.js";

export default class Sentry extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("use-guardian-shield")) {
      super.command(76, null, null, "use-guardian-shield");
    }

    await super.tock();
  }

}
