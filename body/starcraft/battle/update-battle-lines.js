import Line from "../battle/line.js";
import { ALERT_YELLOW } from "../map/alert.js";
import { getHopDistance } from "../map/route.js";
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
  const battleBorderZones = battle.hotspot.back;

  if (!battleBorderZones.size) {
    return (battle.zone.tier.level <= 2) ? new Set([battle.zone]) : new Set();
  } else if (battleBorderZones.has(battle.zone)) {
    return new Set([battle.zone]);
  }

  const approaches = new Set();
  let distance = Infinity;

  for (const zone of battleBorderZones) {
    if (zone.alertLevel > ALERT_YELLOW) continue;

    const hops = battle.zone.getHopsTo(zone);

    if (!hops) continue;

    if (hops.distance < distance) {
      distance = hops.distance;

      approaches.clear();
      approaches.add(zone);
    } else if (hops.distance === distance) {
      approaches.add(zone);
    }
  }

  if (!approaches.size) {
    return new Set([battle.zone]);
  }

  return approaches;
}

function selectActiveApproaches(battle, approaches, limit) {
  if (!approaches.size) return [];
  if (approaches.size <= limit) return [...approaches];

  const distance = new Map();
  const deployments = new Map();

  for (const approach of approaches) {
    distance.set(approach, getHopDistance(approach.cell, wall.base.cell) || Infinity);
    deployments.set(approach, countDeploymentsInZone(battle, approach));
  }

  const active = [...approaches].sort((a, b) => orderByDistanceAndDeployments(a, b, distance, deployments));
  if (active.length > limit) active.length = limit;

  return active;
}

function orderByDistanceAndDeployments(a, b, distance, deployments) {
  const distanceA = distance.get(a);
  const distanceB = distance.get(b);

  if (distanceA === distanceB) {
    return deployments.get(b) - deployments.get(a);
  }

  return distanceA - distanceB;
}

function countDeploymentsInZone(battle, zone) {
  let count = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive) {
      if (warrior.zone === zone) {
        count += 4;
      } else if (zone.range.fire.has(warrior.zone)) {
        count += 3;
      } else if (zone.range.front.has(warrior.zone)) {
        count += 2;
      } else if (zone.range.back.has(warrior.zone)) {
        count += 1;
      }
    }
  }

  return count;
}
