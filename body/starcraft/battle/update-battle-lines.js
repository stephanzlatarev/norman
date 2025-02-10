import Line from "../battle/line.js";

const SURROUND_BALANCE = 1.1;

export default function(battle) {
  const limit = (battle.deployedBalance > SURROUND_BALANCE) ? 3 : 1;
  const approaches = selectApproaches(battle, limit);

  setBattleLines(battle, approaches);
}

function setBattleLines(battle, approaches) {
  const lines = [];
  const zones = new Set();

  for (const zone of approaches) {
    const line = battle.lines.find(one => (one.zone === zone));

    if (line) {
      lines.push(line);
    } else {
      zones.add(zone);
    }
  }

  for (const zone of zones) {
    lines.push(new Line(battle, zone));
  }

  battle.lines = lines;
}

function selectApproaches(battle, limit) {
  if (!battle.front.size) return [];
  if (battle.front.size <= limit) return battle.front;

  const active = [...battle.front];
  const deployments = new Map();

  for (const approach of active) {
    deployments.set(approach, countDeploymentsInZone(battle, approach));
  }

  active.sort((a, b) => orderByTierAndDeployments(a, b, deployments));
  active.length = limit;

  return active;
}

function orderByTierAndDeployments(a, b, deployments) {
  const tierA = a.tier.level;
  const tierB = b.tier.level;

  if (tierA === tierB) {
    return deployments.get(b) - deployments.get(a);
  }

  return tierA - tierB;
}

function countDeploymentsInZone(battle, zone) {
  let count = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive) {
      if (warrior.zone === zone) {
        count += 3;
      } else if (zone.range.fire.has(warrior.zone)) {
        count += 2;
      } else if (zone.range.front.has(warrior.zone)) {
        count += 1;
      }
    }
  }

  return count;
}
