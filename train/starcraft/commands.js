
// Data format: [ <ability>, <direction> ], ability: [0..1], direction: [0..1]
// Action format: { abilityId: <abilityId>, x: <dx>, y: <dy> }, abilityId: { 16, 3674 }, dx: [-1..1], dy: [-1..1]

export function toAction(data) {
  if (!data || (data.length !== 2) || (data[0] < 0.3)) return null;

  return {
    abilityId: (data[0] >= 0.7) ? 3674 : 16,
    x: dx(data[1]),
    y: dy(data[1]),
  };
}

export function toData(action) {
  const data = [0.15, 0];

  if (action && (action.x || action.y)) {
    // First element is the ability
    if (action.abilityId === 16) {
      data[0] = 0.5;
    } else if (action.abilityId === 3674) {
      data[0] = 0.85;
    }

    // Second element is the direction
    const distance = Math.max(Math.abs(action.x), Math.abs(action.y));
    const dx = action.x / distance;
    const dy = action.y / distance;

    if (Math.abs(dx) < Math.abs(dy)) {
      // Direction is either right or left
      if (dy >= 0) {
        // Direction is up
        data[1] = dx / 8 + (dx < 0 ? 1: 0);
      } else {
        // Direction is down
        data[1] = 0.5 - dx / 8;
      }
    } else {
      // Direction is either up or down
      if (dx >= 0) {
        // Direction is right
        data[1] = 0.25 - dy / 8;
      } else {
        // Direction is left
        data[1] = 0.75 + dy / 8;
      }
    }
  }

  return data;
}

export function spinCommand(output, angle, flip) {
  let rotangle = output[1];

  if (flip) rotangle = (1 - 1/8) - rotangle;

  rotangle -= angle / 8;
  if (rotangle < 0) rotangle += 1;
  if (rotangle >= 1) rotangle -= 1;

  return [ output[0], rotangle ];
}

function dx(direction) {
  if (direction < 0.5) {
    return 1 - Math.abs(direction - 0.25) * 4;
  } else {
    return -1 + Math.abs(direction - 0.75) * 4;
  }
}

function dy(direction) {
  if (direction < 0.25) {
    return (0.25 - direction) * 4;
  } else if (direction < 0.75) {
    return -1 + Math.abs(direction - 0.5) * 4;
  } else {
    return (direction - 0.75) * 4;
  }
}
