
export default class Unit {

  constructor(node) {
    this.node = node;
    this.actions = [];
  }

  command(abilityId, targetUnitTag) {
    const command = {
      unitTags: [this.node.get("tag")],
      abilityId: abilityId,
      queueCommand: false,
    };

    if (targetUnitTag) {
      command.targetUnitTag = targetUnitTag;
    }

    this.actions.push({ actionRaw: { unitCommand: command } });
  }

  async tock() {
    const client = this.node.get("channel");

    if (client) {
      await client.action({ actions: this.actions });

      this.actions = [];
    }
  }

}
