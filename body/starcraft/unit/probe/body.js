import Unit from "../body.js";

export default class Probe extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("attack")) {
      const location = this.node.get("attack");
      const locationX = location.get("x");
      const locationY = location.get("y");

      super.command(3674, null, { x: locationX, y: locationY }, "attack");
    } else if (this.node.get("build-nexus")) {
      const location = this.node.get("build-nexus");
      const x = location.get("x");
      const y = location.get("y");

      super.command(880, null, { x: x, y: y }, "build-nexus");
    } else if (this.node.get("build-pylon")) {
      const location = this.node.get("build-pylon");
      const x = location.get("x");
      const y = location.get("y");

      super.command(881, null, { x: x, y: y }, "build-pylon");
    } else if (this.node.get("build-assimilator")) {
      const vespene = this.node.get("build-assimilator").get("tag");

      super.command(882, vespene, null, "build-assimilator");
    } else if (this.node.get("build-gateway")) {
      const location = this.node.get("build-gateway");
      const x = location.get("x");
      const y = location.get("y");

      super.command(883, null, { x: x, y: y }, "build-gateway");
    } else if (this.node.get("move")) {
      const location = this.node.get("move");
      const x = location.get("x");
      const y = location.get("y");

      super.command(16, null, { x: x, y: y }, "move");
    } else if (this.node.get("harvest") && !this.node.get("busy")) {
      const orders = this.node.get("orders");
      const currentAbilityId = (orders && orders.length) ? orders[0].abilityId : -1;
      const currentTargetUnitTag = (orders && orders.length) ? orders[0].targetUnitTag : -1;
      const commandTargetUnitTag = this.node.get("harvest").get("tag");

      if (currentAbilityId === 299) {
        // The probe is returning the harvest. Don't stop it
      } else if ((currentAbilityId !== 298) || (currentTargetUnitTag !== commandTargetUnitTag)) {
        // Command the probe to harvest this mineral field
        super.command(298, commandTargetUnitTag);
      }
    }

    await super.tock();
  }

}
