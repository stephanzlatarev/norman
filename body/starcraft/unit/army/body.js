import Unit from "../body.js";

export default class Army extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("rally")) {
      const location = this.node.get("rally");
      const locationX = location.get("x");
      const locationY = location.get("y");

      super.command(16, null, { x: locationX, y: locationY }, "move");
      this.node.set("orders", [{ unitTags: [...this.node.get("tag")], abilityId: 16, targetWorldSpacePos: { x: locationX, y: locationY } }]);
    } else if (this.node.get("attack")) {
      const location = this.node.get("attack");
      const locationX = location.get("x");
      const locationY = location.get("y");

      super.command(3674, null, { x: locationX, y: locationY }, "attack");
      this.node.set("orders", [{ unitTags: [...this.node.get("tag")], abilityId: 3674, targetWorldSpacePos: { x: locationX, y: locationY } }]);
    } else {
      this.node.set("orders", []);
    }

    await super.tock();
  }

}
