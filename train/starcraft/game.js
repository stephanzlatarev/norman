
export function map(context) {
  return context;
}

export function assign(situation) {
  const assignments = {};

  for (const unit of situation) {
    if (unit.owner === 1) {
      assignments[unit.tag] = (Math.random() < 0.5) ? "explorer" : "standard";
//      assignments[unit.tag] = "standard";
    }
  }

  return assignments;
}

export const POV_SIZE = 65*2;
export function pov(situation, unitTag) {
  const pov = [];
  for (let i = 0 ; i < POV_SIZE; i++) pov.push(0);

  const self = find(situation, unitTag);

  for (const unit of situation) {
    const side = (unit.owner === self.owner) ? 65 : 0;
    const dx = unit.pos.x - self.pos.x;
    const dy = unit.pos.y - self.pos.y;
    const distance = getDistance(dx*dx + dy*dy);
    const angle = getAngle(dx, dy);

    if (distance === 0) {
      pov[side] = 0.1;
    } else {
      pov[side + (distance - 1) * 8 + angle] += 0.1;
    }
  }

  for (let i = 0 ; i < POV_SIZE; i++) if (pov[i] > 1.0) pov[i] = 1.0;

  return pov;
}

export function spinPov(pov, r, f) {
  const rotation = (typeof(r) === "number") ? r : Math.floor(Math.random() * 8);
  const flip = (typeof(f) === "boolean") ? f : (Math.random() < 0.5);
  const result = [];

  for (let side = 0; side <= 65; side += 65) {
    result.push(pov[side]);

    for (let distance = 1; distance <= 8; distance++) {
      for (let angle = 1; angle <= 8; angle++) {
        let rotangle = angle + rotation;
        if (rotangle > 8) rotangle -= 8;
        if (flip) rotangle = 9 - rotangle;

        result.push(pov[side + (distance - 1) * 8 + rotangle]);
      }
    }
  }

  return result;
}

const POV_SQUARE_DISTANCE = [0, 1, 3*3, 6*6, 14*14, 32*32, 76*76, 182*182];
function getDistance(dd) {
  for (let distance = 0; distance < POV_SQUARE_DISTANCE.length; distance++) {
    if (dd <= POV_SQUARE_DISTANCE[distance]) return distance;
  }
  return POV_SQUARE_DISTANCE.length;
}

const POV_ANGLE_THRESHOLD = 0.41421356; // Math.tan(22.5 degree)
function getAngle(dx, dy) {
  if ((dx >= 0) && (dy >= 0)) {
    if (dx / dy < POV_ANGLE_THRESHOLD) {
      return 1;
    } else if (dy / dx < POV_ANGLE_THRESHOLD) {
      return 3;
    } else {
      return 2;
    }
  } else if ((dx >= 0) && (dy < 0)) {
    if (dx / -dy < POV_ANGLE_THRESHOLD) {
      return 5;
    } else if (-dy / dx < POV_ANGLE_THRESHOLD) {
      return 3;
    } else {
      return 4;
    }
  } else if ((dx < 0) && (dy < 0)) {
    if (-dx / -dy < POV_ANGLE_THRESHOLD) {
      return 5;
    } else if (-dy / -dx < POV_ANGLE_THRESHOLD) {
      return 7;
    } else {
      return 6;
    }
  } else if ((dx < 0) && (dy >= 0)) {
    if (-dx / dy < POV_ANGLE_THRESHOLD) {
      return 1;
    } else if (dy / -dx < POV_ANGLE_THRESHOLD) {
      return 7;
    } else {
      return 8;
    }
  }
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

function find(situation, unitTag) {
  for (const unit of situation) {
    if (unit.tag === unitTag) {
      return unit;
    }
  }
}
