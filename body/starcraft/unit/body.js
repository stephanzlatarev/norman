
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

      if (!isMatchingAny(orders, command.unitTags, command.abilityId, command.targetUnitTag, command.targetWorldSpacePos)) {
        this.completedCommands.push(command);
        this.progressingCommands.splice(i, 1);
      }
    }

    for (let i = this.pendingCommands.length - 1; i >= 0; i--) {
      const command = this.pendingCommands[i];

      if (isMatchingAny(orders, command.unitTags, command.abilityId, command.targetUnitTag, command.targetWorldSpacePos)) {
        this.progressingCommands.push(command);
      } else {
        // The command has been executed immediately
        if (command.memoryLabel) {
          this.node.clear(command.memoryLabel);
        }
      }

      this.pendingCommands.splice(i, 1);
    }

    this.node.set("busy", (this.pendingCommands.length + this.progressingCommands.length + this.completedCommands.length) > 0);
  }

  command(abilityId, targetUnitTag, targetWorldSpacePos, memoryLabel) {
    const unitTag = this.node.get("tag");
    const unitTags = Array.isArray(unitTag) ? unitTag : [unitTag];

    if (isMatchingAny(this.node.get("orders"), unitTags, abilityId, targetUnitTag, targetWorldSpacePos)) return false;
    if (isMatchingAny(this.pendingCommands, unitTags, abilityId, targetUnitTag, targetWorldSpacePos)) return false;

    const command = {
      unitTags: unitTags,
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
    this.node.set("busy", true);

    return true;
  }

  async tock() {
    const client = this.node.get("channel");

    if (client && this.actions.length) {
      await client.action({ actions: this.actions });

      this.actions = [];
    }
  }

}

function isMatchingAny(commands, unitTags, abilityId, targetUnitTag, targetWorldSpacePos) {
  for (const command of commands) {
    if (isMatchingOne(command, unitTags, abilityId, targetUnitTag, targetWorldSpacePos)) return true;
  }
}

function isMatchingOne(command, unitTags, abilityId, targetUnitTag, targetWorldSpacePos) {
  if (command.abilityId !== abilityId) return false;
  if (command.unitTags && !isMatchingArray(command.unitTags, unitTags)) return false;
  if ((command.targetUnitTag || targetUnitTag) && (command.targetUnitTag !== targetUnitTag)) return false;
  if (!isMatchingPos(command.targetWorldSpacePos, targetWorldSpacePos)) return false;
  return true;
}

function isMatchingPos(a, b) {
  if (!a !== !b) return false;
  if (!a && !b) return true;
  if (Math.abs(a.x - b.x) >= 1) return false;
  if (Math.abs(a.y - b.y) >= 1) return false;
  return true;
}

function isMatchingArray(a, b) {
  return JSON.stringify(a.sort()) === JSON.stringify(b.sort());
}
