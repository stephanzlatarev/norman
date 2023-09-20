
let client;
let lines = [];
let spheres = [];

function use(c) {
  client = c;
}

async function show() {
  await new Promise(resolve => setTimeout(resolve, 1000));

  await client.debug({ debug: [{ draw: { lines: lines, spheres: spheres } }] });

  lines.length = 0;
  spheres.length = 0;
}

function arrow(color, start, end) {
  const dot = (start.x === end.x) && (start.y === end.y);
  for (let z = 8; z <= 9; z += 0.2) {
    lines.push({ line: { p0: { x: start.x, y: start.y, z: z }, p1: { x: end.x, y: end.y, z: dot ? 10 : z } }, color: color });
  }

  if ((color.r === 255) || (color.b === 255)) {
    spheres.push({ p: { x: end.x, y: end.y, z: 9 }, r: 0.2, color: { r: 200, g: 200, b: 200 } });
  }
}

const debug = {
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 255, b: 0 },
  blue: { r: 100, g: 100, b: 255 },
  use: use,
  arrow: arrow,
  show: show,
};

export default debug;
