import { WORKERS } from "../units.js";

export default class DelayFirstEnemyExpansionMission {

  complete = false;
  agentTag = null;

  run(commands, model, units) {
    if (this.complete) return;

    const agent = selectAgent(units, this.agentTag);
    if (!agent) return;
    this.agentTag = agent.tag;

    const target = findTarget(model);

    if (isCloseTo(agent.pos, target)) {
      agent.isBusy = false;
      this.complete = true;
    } else {
      createMoveCommand(commands, agent, target);
      agent.isBusy = true;
    }
  }

}

function selectAgent(units, tag) {
  for (const [_, unit] of units) {
    if (WORKERS[unit.unitType] && (!tag || (unit.tag === tag))) {
      return unit;
    }
  }
}

function findTarget(model) {
  const enemy = model.get("Enemy");

  return {
    x: enemy.get("baseX"),
    y: enemy.get("baseY"),
  };
}

function createMoveCommand(commands, agent, pos) {
  if (!agent || !pos) return;

  const order = agent.orders.length ? agent.orders[0] : { abilityId: 0 };

  if (!order || !order.abilityId && isCloseTo(agent.pos, pos)) return;

  if ((order.abilityId !== 16) || !order.targetWorldSpacePos || !isSamePosition(order.targetWorldSpacePos, pos)) {
    commands.push({ unitTags: [agent.tag], abilityId: 16, targetWorldSpacePos: pos, queueCommand: false });
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) <= 3) && (Math.abs(a.y - b.y) <= 3);
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) <= 10) && (Math.abs(a.y - b.y) <= 10);
}
