
export default function(battle) {
  if (!battle.lines.length) return;

  const distances = new Map();
  const jobs = new Map();

  for (const fighter of battle.fighters) {
    let line;

    if (fighter.assignee && fighter.assignee.isAlive) {
      line = getBattleLine(battle, fighter, distances);
    } else {
      line = battle.lines.find(one => (one.zone === fighter.zone));
    }

    if (!line) {
      line = battle.lines[0];
    }

    addFighterJob(jobs, line, fighter);
  }

  for (const [line, fighters] of jobs) {
    line.fighters = [...fighters];
  }
}

function addFighterJob(jobs, line, fighter) {
  const set = jobs.get(line);

  if (set) {
    set.add(fighter);
  } else {
    jobs.set(line, new Set([fighter]));
  }
}

function getBattleLine(battle, fighter, distances) {
  const warrior = fighter.assignee;

  // If fighter is deployed in the zone of an active battle line, then make sure the fighter is assigned to that battle line
  for (const line of battle.lines) {
    if ((fighter.zone === line.zone) && (warrior.zone === line.zone)) {
      return line;
    }
  }

  // Otherwise, assign it to the closest active battle line
  return getClosestUnobstructedBattleLine(warrior, battle.lines, distances) || getClosestBattleLine(warrior, battle.lines);
}

function getClosestUnobstructedBattleLine(warrior, lines, distances) {
  let bestLine;
  let bestDistance = Infinity;

  for (const line of lines) {
    const warriorDistance = getDistance(distances, warrior, line);

    if (bestDistance < warriorDistance) continue;

    let isObstructed = false;

    for (const threat of warrior.zone.threats) {
      const threatDistance = getDistance(distances, threat, line);

      if (threatDistance <= warriorDistance) {
        isObstructed = true;
        break;
      }
    }

    if (!isObstructed) {
      bestLine = line;
      bestDistance = warriorDistance;
    }
  }

  return bestLine;
}

function getDistance(distances, unit, line) {
  let map = distances.get(line);

  if (!map) {
    map = new Map();
    distances.set(line, map);
  }

  let distance = map.get(unit);

  if (!distance) {
    distance = calculateSquareDistance(unit.body, line);
    map.set(unit, distance);
  }

  return distance;
}

function getClosestBattleLine(warrior, lines) {
  let closestLine;
  let closestDistance = Infinity;

  for (const line of lines) {
    const distance = calculateSquareDistance(warrior.body, line);

    if (distance < closestDistance) {
      closestLine = line;
      closestDistance = distance;
    }
  }

  return closestLine;
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
