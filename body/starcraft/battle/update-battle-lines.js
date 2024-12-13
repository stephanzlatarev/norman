import Line from "../battle/line.js";
import { ALERT_YELLOW } from "../map/alert.js";
import Wall from "../map/wall.js";

const SURROUND_BALANCE = 1.1;

const wall = { zone: null, zones: new Set(), base: null };

export default function(battle) {
  if (!wall.base) findWall();

  if (wall.zones.has(battle.zone)) {
    setBattleLines(battle, [wall.base]);
  } else {
    const approaches = selectBattleLineApproaches(battle);
    const limit = (battle.deployedBalance > SURROUND_BALANCE) ? 3 : 1;
    const active = selectActiveApproaches(battle, approaches, limit);

    setBattleLines(battle, active);
  }
}

function findWall() {
  const walls = Wall.list();

  if (walls.length) {
    wall.zone = walls[0];
    wall.zones.add(wall.zone);

    for (const zone of wall.zone.zones) {
      wall.zones.add(zone);

      if (!wall.base || (zone.tier.level < wall.base.tier.level)) wall.base = zone;
    }
  }
}

function setBattleLines(battle, zones) {
  const lines = [];
  const addZones = new Set();

  for (const zone of zones) {
    const line = battle.lines.find(one => (one.zone === zone));

    if (line) {
      lines.push(line);
    } else {
      addZones.add(zone);
    }
  }

  for (const zone of addZones) {
    lines.push(new Line(battle, zone));
  }

  battle.lines = lines;
}

function selectBattleLineApproaches(battle) {
  const approaches = new Set();

  for (const zone of battle.front) {
    if (zone.alertLevel <= ALERT_YELLOW) {
      approaches.add(zone);
    }
  }

  if (!approaches.size) {
    let tierLevel = Infinity;

    for (const zone of battle.front) {
      if (zone.tier.level < tierLevel) {
        tierLevel = zone.tier.level;
        approaches.clear();
      }

      if (zone.tier.level === tierLevel) {
        approaches.add(battle.zone);
      }
    }
  }

  return approaches;
}

function selectActiveApproaches(battle, approaches, limit) {
  if (!approaches.size) return [];
  if (approaches.size <= limit) return [...approaches];

  const deployments = new Map();

  for (const approach of approaches) {
    deployments.set(approach, countDeploymentsInZone(battle, approach));
  }

  const active = [...approaches].sort((a, b) => orderByTierAndDeployments(a, b, deployments));
  if (active.length > limit) active.length = limit;

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
