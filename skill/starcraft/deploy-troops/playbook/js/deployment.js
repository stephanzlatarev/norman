
export const EMPTY = heatmap(100, 0);

export function random(positions, count) {
  if (count >= 1) {
    const list = [];

    for (let i = 0; i < count; i++) {
      list.push(random(positions));
    }

    return list;
  } else {
    return positions[Math.floor(positions.length * Math.random())];
  }
}

export function add(heatmap, positions, value) {
  if (Array.isArray(positions)) {
    for (const position of positions) {
      add(heatmap, position, value);
    }
  } else {
    const spot = positions.x + positions.y * 10;
    heatmap[spot] = Math.min(heatmap[spot] + value, 1);
  }
}

function heatmap(size, value) {
  const heatmap = [];

  for (let i = 0; i < size; i++) {
    heatmap.push(value);
  }

  return heatmap;
}

export const ALL_POSITIONS = [];
for (let x = 0; x < 10; x++) {
  for (let y = 0; y < 10; y++) {
    ALL_POSITIONS.push({ x: x, y: y });
  }
}

export const ENEMY_POSITIONS = [];
for (let x = 0; x < 4; x++) {
  for (let y = 0; y < 4; y++) {
    ENEMY_POSITIONS.push({ x: x, y: y });
  }
}

export const OWN_POSITIONS = [];
for (let x = 6; x < 10; x++) {
  for (let y = 6; y < 10; y++) {
    OWN_POSITIONS.push({ x: x, y: y });
  }
}

export function scale(...heatmaps) {
  let scale = 0;

  for (const heatmap of heatmaps) {
    for (const value of heatmap) {
      scale = Math.max(scale, Math.abs(value));
    }
  }

  for (const heatmap of heatmaps) {
    for (let i = 0; i < heatmap.length; i++) {
      heatmap[i] /= scale;
    }
  }

  return scale;
}