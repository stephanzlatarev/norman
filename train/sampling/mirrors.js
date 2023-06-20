
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
  return { x: index % 10, y: Math.floor(index / 10) };
}

function spot2index(spot) {
  return spot.x + spot.y * 10;
}

// Flip from left to right
function flip(spot) {
  return { x: 9 - spot.x, y: spot.y };
}

// Rotate by 90 degrees
function rotate(spot) {
  return { x: 9 - spot.y, y: spot.x };
}

function mirror(data, mirror) {
  const result = [...data];

  if (mirror) {
    for (let index = 0; index < data.length; index++) {
      result[index] = data[mirror(index)];
    }
  }

  return result;
}

const MIRRORS = [];

for (const lense of LENSES) {
  MIRRORS.push((data) => mirror(data, lense));
}

export default MIRRORS;
