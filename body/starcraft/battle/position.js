
export default class Position {

  // The map cell where this position is located
  entrance;
  zone;
  cell;
  x;
  y;

  // The first target from this position
  target;

  // Distances from the cell to the targets
  distances = new Map();

  scores = new Map();

  constructor(cell, entrance) {
    this.entrance = entrance;
    this.zone = cell.zone;
    this.cell = cell;
    this.x = cell.x;
    this.y = cell.y;
  }

  // TODO: Optimize by calculating distances between cells and only if targets moved between cells
  assess(targets) {
    const distances = this.distances;

    this.targets = [...targets];

    for (const target of targets) {
      distances.set(target, calculateDistance(this.cell, target.body));
    }

    this.targets.sort((a, b) => (distances.get(a) - distances.get(b)));
    this.target = this.targets[0];
    this.scores.clear();
  }

  // Calculates the score of this position by warrior type as the difference between lifetime and walktime
  // TODO: Account for air enemy units. The score should differ for ground and air units, and the target too
  score(warrior) {
    let score = this.scores.get(warrior.type);

    if (score >= 0) return score;

    if (this.targets.length) {
      const walktime = calculateWalkTime(warrior, this.distances.get(this.targets[0]));
      const lifetime = calculateLifeTime(warrior, walktime, this.targets, this.distances);

      score = lifetime - walktime;
    } else {
      score = 0;
    }

    this.scores.set(warrior.type, score);

    return score;
  }

}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

function calculateWalkTime(warrior, distance) {
  return Math.max((distance - warrior.type.rangeGround) / warrior.type.movementSpeed, 0);
}

// This implementation uses the order of targets by distance not taking into account their range and speed
function calculateLifeTime(warrior, walktime, targets, distances) {
  const walk = walktime * warrior.type.movementSpeed;

  // TODO: Use maximum armor (instead of fixed 200) because we calculate score for the warrior type, not the given unit
  let health = 200;
  let time = 0;
  let dpl = 0;

  for (const enemy of targets) {
    if (!enemy.type.damageGround) continue;

    const distance = distances.get(enemy) - enemy.type.rangeGround;

    if (distance > walk) {
      // This enemy needs to move to damage the warrior
      if (enemy.type.movementSpeed > 0) {
        const enemyWalkTime = ((distance - walk) / enemy.type.movementSpeed);

        health -= enemyWalkTime * dpl;
        time += enemyWalkTime;
        dpl += enemy.type.damageGround;
      }
    } else if (distance > 0) {
      // Warrior got in range of this enemy during its walk
      health -= time * enemy.type.damageGround * walk / distance;
      dpl += enemy.type.damageGround;
    } else {
      // Warrior is in range of this enemy since start
      health -= time * enemy.type.damageGround;
      dpl += enemy.type.damageGround;
    }

    if (health <= 0) {
      return time;
    }
  }

  if (!dpl) {
    time = Infinity;
  } else if (health > 0) {
    time += (health / dpl);
  }

  return time;
}
