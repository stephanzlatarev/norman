
export default class Corridor {

  constructor(type, path, via) {
    this.type = type;
    this.via = via;          // No via zone means the corridor is direct
    this.path = canon(path); // List of cells from one zone to its neighbor that form a path
    this.name = name(type, path, via);

    this.isAir = (type === "air");
    this.isChoke = (type === "choke") || !!via;
    this.isCliff = (type === "cliff");
    this.isCurtain = (type === "curtain");
    this.isGround = (type === "ground");
    this.isMinerals = (type === "minerals");
    this.isRamp = (type === "ramp");

    // By default ground corridors are ground passable
    this.isGroundPassable = (this.isChoke || this.isCurtain || this.isGround || this.isRamp);

    if (this.isGroundPassable) {
      for (const cell of this.path) {
        if (!cell.isPath) {
          console.log("[map] Path of", type, "corridor goes through non path cell:", cell.x, cell.y);
        }
      }
    }
  }

}

function canon(path) {
  if (!path || !path.length) return [];

  let current = path[0];
  const canon = [current];

  for (let i = 1; i < path.length; i++) {
    const cell = path[i];

    if (cell === current) continue;
    if (cell.rim.has(current)) continue;

    canon.push(cell);
    current = cell;
  }

  const last = path[path.length - 1];

  if (last !== canon[canon.length - 1]) {
    canon.push(last);
  }

  return canon;
}

function name(type, path, via) {
  if (path.length < 2) return "???";

  const start = path[0].cluster;
  const end = path[path.length - 1].cluster;

  if (via) {
    return `${type}:${start.name}-${via.name}-${end.name}`;
  } else {
    return `${type}:${start.name}-${end.name}`;
  }
}
