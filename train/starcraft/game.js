
export function map(context) {
  const situation = [];

  for (const unit of context) {
    situation.push({
      tag: unit.tag,
      owner: unit.owner,
      x: unit.pos.x,
      y: unit.pos.y,
    });
  }

  return situation;
}

export function assign(situation) {
  const assignments = {};

  for (const unit of situation) {
    if (unit.owner === 1) {
      assignments[unit.tag] = (Math.random() < 0.5) ? "explorer" : "standard";
    }
  }

  return assignments;
}

export function score(context) {
  let countOwn = 0;
  let countEnemies = 0;
  let score = 0;

  for (const unit of context) {
    if (unit.owner === 1) {
      countOwn++;
      score += unit.health + unit.shield;
    } else {
      countEnemies++;
      score -= unit.health;
    }
  }

  if (!countOwn || !countEnemies) {
    //12 units with 40 max health
    return score / 40 / 12;
  }
}
