// Angle is in [1, 2, 3, ..., 7]
// Direction is in range [0..1)

export function dx(direction) {
  if (direction < 0.5) {
    return 1 - Math.abs(direction - 0.25) * 4;
  } else {
    return -1 + Math.abs(direction - 0.75) * 4;
  }
}

export function dy(direction) {
  if (direction < 0.25) {
    return (0.25 - direction) * 4;
  } else if (direction < 0.75) {
    return -1 + Math.abs(direction - 0.5) * 4;
  } else {
    return (direction - 0.75) * 4;
  }
}

export function direction(x, y) {
  if (x || y) {
    const distance = Math.max(Math.abs(x), Math.abs(y));
    const dx = x / distance;
    const dy = y / distance;

    if (Math.abs(dx) < Math.abs(dy)) {
      // Direction is either right or left
      if (dy >= 0) {
        // Direction is up
        return dx / 8 + (dx < 0 ? 1: 0);
      } else {
        // Direction is down
        return 0.5 - dx / 8;
      }
    } else {
      // Direction is either up or down
      if (dx >= 0) {
        // Direction is right
        return 0.25 - dy / 8;
      } else {
        // Direction is left
        return 0.75 + dy / 8;
      }
    }
  }

  return 0;
}

const POV_ANGLE_THRESHOLD = 0.41421356; // Math.tan(22.5 degree)

export function angle(dx, dy) {
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

export function distance(d, stones) {
  for (let distance = 0; distance < stones.length; distance++) {
    if (d <= stones[distance]) {
      return distance;
    }
  }

  return stones.length;
}
