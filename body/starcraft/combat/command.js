
export function createAttackCommand(commands, warrior, pos) {
  if (!warrior || !warrior.order || !warrior.body || !pos) return;

  if (
    (warrior.order.abilityId !== 23) ||
    (warrior.order.targetWorldSpacePos && !isSamePosition(warrior.order.targetWorldSpacePos, pos)) ||
    (warrior.order.targetUnitTag && isFarFrom(warrior.body, pos))
  ) {
    commands.push({ unitTags: [warrior.tag], abilityId: 3674, targetWorldSpacePos: pos, queueCommand: false });
  }
}

export function createMoveCommand(commands, warrior, pos) {
  if (!warrior || !warrior.order || !warrior.body || !pos) return;

  if (!warrior.order.abilityId && isCloseTo(warrior.body, pos)) return;

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    commands.push({ unitTags: [warrior.tag], abilityId: 16, targetWorldSpacePos: pos, queueCommand: false });
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) <= 3) && (Math.abs(a.y - b.y) <= 3);
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) <= 10) && (Math.abs(a.y - b.y) <= 10);
}

function isFarFrom(a, b) {
  return (Math.abs(a.x - b.x) >= 20) && (Math.abs(a.y - b.y) >= 20);
}
