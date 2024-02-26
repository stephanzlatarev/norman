
export default function(commands, warriors, enemy) {
  for (const warrior of warriors) {
    createAttackCommand(commands, warrior, enemy.body);
  }
}

function createAttackCommand(commands, warrior, pos) {
  if ((warrior.order.abilityId !== 23) || (warrior.order.targetWorldSpacePos && !isSamePosition(warrior.order.targetWorldSpacePos, pos))) {
    commands.push({ unitTags: [warrior.tag], abilityId: 3674, targetWorldSpacePos: pos, queueCommand: false });
  }
}

function isSamePosition(a, b) {
  return ((a.x >= b.x - 1) && (a.x <= b.x + 1) && (a.y >= b.y - 1) && (a.y <= b.y + 1));
}
