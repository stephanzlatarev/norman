
export default class Unit {

  constructor(node) {
    this.node = node;
    this.actions = [];
    this.pendingCommands = [];
    this.progressingCommands = [];
    this.completedCommands = [];
  }

  async tick() {
    const orders = this.node.get("orders");

    for (const command of this.completedCommands) {
      if (command.memoryLabel) {
        this.node.clear(command.memoryLabel);
      }
    }
    this.completedCommands = [];

    for (let i = this.progressingCommands.length - 1; i >= 0; i--) {
      const command = this.progressingCommands[i];

      if (!isMatchingAny(orders, command.abilityId, command.targetUnitTag, command.targetWorldSpacePos)) {
        this.completedCommands.push(command);
        this.progressingCommands.splice(i, 1);
      }
    }

    for (let i = this.pendingCommands.length - 1; i >= 0; i--) {
      const command = this.pendingCommands[i];

      if (isMatchingAny(orders, command.abilityId, command.targetUnitTag, command.targetWorldSpacePos)) {
        this.progressingCommands.push(command);
      } else {
        // The command has been executed immediately
        if (command.memoryLabel) {
          this.node.clear(command.memoryLabel);
        }
      }

      this.pendingCommands.splice(i, 1);
    }
  }

  command(abilityId, targetUnitTag, targetWorldSpacePos, memoryLabel) {
    if (isMatchingAny(this.node.get("orders"), abilityId, targetUnitTag, targetWorldSpacePos)) return;
    if (isMatchingAny(this.pendingCommands, abilityId, targetUnitTag, targetWorldSpacePos)) return;

    const command = {
      unitTags: [this.node.get("tag")],
      abilityId: abilityId,
      queueCommand: !!this.actions.length,
      memoryLabel: memoryLabel,
    };

    if (targetUnitTag) {
      command.targetUnitTag = targetUnitTag;
    }

    if (targetWorldSpacePos) {
      command.targetWorldSpacePos = targetWorldSpacePos;
    }

    this.actions.push({ actionRaw: { unitCommand: command } });
    this.pendingCommands.push(command);
  }

  async tock() {
    const client = this.node.get("channel");

    if (client && this.actions.length) {
      await client.action({ actions: this.actions });

      this.actions = [];
    }
  }

}

function isMatchingAny(commands, abilityId, targetUnitTag, targetWorldSpacePos) {
  for (const command of commands) {
    if (isMatchingOne(command, abilityId, targetUnitTag, targetWorldSpacePos)) return true;
  }
}

function isMatchingOne(command, abilityId, targetUnitTag, targetWorldSpacePos) {
  if (command.abilityId !== abilityId) return false;
  if ((command.targetUnitTag || targetUnitTag) && (command.targetUnitTag !== targetUnitTag)) return false;
  if ((command.targetWorldSpacePos || targetWorldSpacePos) &&
      ((command.targetWorldSpacePos.x !== targetWorldSpacePos.x) || (command.targetWorldSpacePos.y !== targetWorldSpacePos.y))) return false;
  return true;
}
