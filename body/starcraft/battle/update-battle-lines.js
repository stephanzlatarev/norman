import Battle from "../battle/battle.js";
import Line from "../battle/line.js";
import { getHopDistance } from "../map/route.js";
import Wall from "../map/wall.js";

const wall = { zone: null, zones: new Set(), base: null };

export default function(battle) {
  if (!wall.base) findWall();

  if (wall.zones.has(battle.zone)) {
    setBattleLines(battle, [wall.base]);
  } else {
    const approaches = selectBattleLineApproaches(battle);
    const limit = (battle.range === Battle.RANGE_BACK) ? 1 : 3;
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
  if (battle.range === Battle.RANGE_FRONT) {
    // Selects the closest zones in each corridor direction from the battle zone
    const battleFrontZones = battle.hotspot.front;

    if (!battleFrontZones.size) return new Set();
    if (battleFrontZones.has(battle.zone)) return new Set([battle.zone]);

    const approaches = new Set();

    for (const corridor of battle.zone.corridors) {
      const closestZones = getClosestZonesInDirection(battleFrontZones, battle.zone, corridor);

      for (const zone of closestZones) {
        approaches.add(zone);
      }
    }

    return approaches;
  } else {
    return new Set([...battle.hotspot.back]);
  }
}

function getClosestZonesInDirection(zones, center, direction) {
  let closestZones = new Set();
  let leastDistance = Infinity;

  for (const zone of zones) {
    const hops = center.getHopsTo(zone);

    if (!hops || (hops.direction !== direction)) continue;

    if (hops.distance < leastDistance) {
      closestZones = new Set([zone]);
      leastDistance = hops.distance;
    } else if (hops.distance === leastDistance) {
      closestZones.add(zone);
    }
  }

  return closestZones;
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
