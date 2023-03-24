import Unit from "../body.js";

const ABILITY_ON_POINT = {
  "attack": 3674,
  "build-nexus": 880,
  "build-pylon": 881,
  "build-gateway": 883,
  "build-forge": 884,
  "build-beacon": 885,
  "build-council": 886,
  "build-stargate": 889,
  "build-robotics": 893,
  "build-cybernetics": 894,
  "move": 16,
};

const ABILITY_ON_UNIT = {
  "build-assimilator": 882,
};

export default class Probe extends Unit {

  constructor(node) {
    super(node);
  }

  async tick() {
    await super.tick();

    const harvest = this.node.get("harvest");
    if (harvest && (harvest.get("unitType") === "assimilator")) {
      this.node.set("busy", true);
    }
  }

  async tock() {
    const army = this.node.get("game").get("army");
    if (army && (army.get("mobilizeWorkers") > 0) && army.get("attack")) {
      return;
    }

    let isCommandIssued = false;

    for (const command in ABILITY_ON_POINT) {
      const location = this.node.get(command);

      if (location) {
        const locationX = location.get("x");
        const locationY = location.get("y");

        super.command(ABILITY_ON_POINT[command], null, { x: locationX, y: locationY }, command);

        isCommandIssued = true;
        this.node.clear("harvest");

        // Break loop because this probe can perform only one command now
        break;
      }
    }

    if (!isCommandIssued) {
      for (const command in ABILITY_ON_UNIT) {
        const unit = this.node.get(command);

        if (unit) {
          super.command(ABILITY_ON_UNIT[command], unit.get("tag"), null, command);

          isCommandIssued = true;
          this.node.clear("harvest");

          // Break loop because this probe can perform only one command now
          break;
        }
      }
    }

    if (!isCommandIssued && this.node.get("harvest")) {
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
