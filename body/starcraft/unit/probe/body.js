import Unit from "../body.js";

export default class Probe extends Unit {

  constructor(node) {
    super(node);
  }

  async tock() {
    const harvestMineralField = this.node.get("harvest");

    if (harvestMineralField) {
      const currentAbilityId = this.node.get("orderAbilityId");
      const currentTargetUnitTag = this.node.get("orderTargetUnitTag");
      const commandTargetUnitTag = harvestMineralField.get("tag");

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
