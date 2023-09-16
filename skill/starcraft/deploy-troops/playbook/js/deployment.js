import { SIZE } from "./battlefield.js";

export const EMPTY = heatmap(SIZE * SIZE, 0);

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
    const spot = positions.x + positions.y * SIZE;
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
for (let x = 0; x < SIZE; x++) {
  for (let y = 0; y < SIZE; y++) {
    ALL_POSITIONS.push({ x: x, y: y });
  }
}

export const ENEMY_POSITIONS = [];
const ENEMY_SIDE = Math.floor(SIZE / 2) - 1;
for (let x = 0; x <= ENEMY_SIDE; x++) {
  for (let y = 0; y <= ENEMY_SIDE; y++) {
    ENEMY_POSITIONS.push({ x: x, y: y });
  }
}

export const OWN_POSITIONS = [];
const OWN_SIDE = Math.floor(SIZE / 2) + 1;
for (let x = OWN_SIDE; x < SIZE; x++) {
  for (let y = OWN_SIDE; y < SIZE; y++) {
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