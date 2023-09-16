import { SIZE } from "./battlefield.js";

const LENSES = [
  null,
  (index) => spot2index(rotate(index2spot(index))),
  (index) => spot2index(rotate(rotate(index2spot(index)))),
  (index) => spot2index(rotate(rotate(rotate(index2spot(index))))),

  (index) => spot2index(flip(index2spot(index))),
  (index) => spot2index(rotate(flip(index2spot(index)))),
  (index) => spot2index(rotate(rotate(flip(index2spot(index))))),
  (index) => spot2index(rotate(rotate(rotate(flip(index2spot(index)))))),
];

function index2spot(index) {
  return { x: index % SIZE, y: Math.floor(index / SIZE) };
}

function spot2index(spot) {
  return spot.x + spot.y * SIZE;
}

// Flip from left to right
function flip(spot) {
  return { x: SIZE - 1 - spot.x, y: spot.y };
}

// Rotate by 90 degrees
function rotate(spot) {
  return { x: SIZE - 1 - spot.y, y: spot.x };
}

function mirror(data, mirror) {
  const result = [...data];

  if (mirror) {
    for (let page = 0; page < data.length; page += SIZE * SIZE) {
      for (let index = 0; index < SIZE * SIZE; index++) {
        result[page + index] = data[page + mirror(index)];
      }
    }
  }

  return result;
}

const MIRRORS = [];

for (const lense of LENSES) {
  MIRRORS.push((data) => mirror(data, lense));
}

export default MIRRORS;
