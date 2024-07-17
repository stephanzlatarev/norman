import Map from "../map/map.js";

const orbs = [];

let size = 0;
for (; size < 4; size++) {
  orbs.push([]);
}
for (let size = 4; size <= 25; size++) {
  const orb = [];
  const square = size * size;

  let x = 0;
  let y = size;

  while (x <= y) {
    orb.push({ x: +x, y: -y });
    orb.push({ x: +x, y: +y });
    orb.push({ x: -x, y: +y });
    orb.push({ x: -x, y: -y });

    if (x < y) {
      orb.push({ x: +y, y: -x });
      orb.push({ x: +y, y: +x });
      orb.push({ x: -y, y: +x });
      orb.push({ x: -y, y: -x });
    }

    x++;
    if (x * x + (y - 1) * (y - 1) >= square) y--;
  }
  
  orbs.push(orb);
}

export default orbs;

export function getOrbCells(pos, range) {
  const cells = [];
  const list = orbs[Math.max(5, Math.min(Math.ceil(range), orbs.length - 1))];
  const posx = Math.floor(pos.x);
  const posy = Math.floor(pos.y);

  for (const orb of list) {
    cells.push(Map.cell(posx + orb.x, posy + orb.y));
  }

  return cells;
}

export function isCellInOrb(pos, range, cell) {
  const posx = Math.floor(pos.x);
  const posy = Math.floor(pos.y);
  const squareDistance = (cell.x - posx) * (cell.x - posx) + (cell.y - posy) * (cell.y - posy);
  const roundRange = Math.ceil(range);

  return (squareDistance < roundRange * roundRange);
}
