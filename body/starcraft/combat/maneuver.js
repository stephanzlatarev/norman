
export default function(fights) {
  const commands = [];

  for (const fight of fights) {
    const enemy = fight.enemy;

    for (const warrior of fight.warriors) {
      createAttackCommand(commands, warrior, enemy);
    }
  }

  return commands;
}

function createAttackCommand(commands, warrior, enemy) {
  if ((warrior.order.abilityId !== 3674) || (warrior.order.targetUnitTag !== enemy.tag)) {
    commands.push({ unitTags: [warrior.tag], abilityId: 3674, targetUnitTag: enemy.tag, queueCommand: false });
  }
  warrior.gotOrders = true;
}

function createMoveCommand(commands, warrior, pos) {
  if ((warrior.order.abilityId !== 16) || (warrior.order.targetWorldSpacePos.x !== pos.x) || (warrior.order.targetWorldSpacePos.y !== pos.y)) {
    commands.push({ unitTags: [warrior.tag], abilityId: 16, targetWorldSpacePos: pos, queueCommand: false });
  }
  warrior.gotOrders = true;
}
