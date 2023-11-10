import Mission from "./mission.js";

export default function(missions, commands) {
  for (const mission of missions) {
    const target = mission.target;

    for (const warrior of mission.warriors) {
      if (mission.type === Mission.Scout) {
        createMoveCommand(commands, warrior, target);
      } else {
        createAttackCommand(commands, warrior, target);
      }
    }
  }
}

function createAttackCommand(commands, warrior, targetUnit) {
  if ((warrior.order.abilityId !== 3674) || (warrior.order.targetUnitTag !== targetUnit.tag)) {
    commands.push({ unitTags: [warrior.tag], abilityId: 3674, targetUnitTag: targetUnit.tag, queueCommand: false });
  }
}

function createMoveCommand(commands, warrior, pos) {
  if ((warrior.order.abilityId !== 16) || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    commands.push({ unitTags: [warrior.tag], abilityId: 16, targetWorldSpacePos: pos, queueCommand: false });
  }
}

function isSamePosition(a, b) {
  return ((a.x >= b.x - 0.1) && (a.x <= b.x + 0.1) && (a.y >= b.y - 0.1) && (a.y <= b.y + 0.1));
}
