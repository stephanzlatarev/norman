import Unit from "../body.js";

export default class Probe extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    if (this.node.get("build-pylon")) {
      const location = this.node.get("build-pylon");
      const x = location.get("x");
      const y = location.get("y");

      super.command(881, null, { x: x, y: y });

      this.node.set("orderAbilityId", 881);
    } else if (this.node.get("harvest")) {
      const currentAbilityId = this.node.get("orderAbilityId");
      const currentTargetUnitTag = this.node.get("orderTargetUnitTag");
      const commandTargetUnitTag = this.node.get("harvest").get("tag");

      if (currentAbilityId === 299) {
        // The probe is returning the harvest. Don't stop it
      } else if ((currentAbilityId !== 298) || (currentTargetUnitTag !== commandTargetUnitTag)) {
        // Command the probe to harvest this mineral field
        super.command(298, commandTargetUnitTag);

        this.node.set("orderAbilityId", 298);
        this.node.set("orderTargetUnitTag", commandTargetUnitTag);
      }
    }

    await super.tock();
  }

}
