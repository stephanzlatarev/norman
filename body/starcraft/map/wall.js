import Depot from "./depot.js";
import Hub from "./hub.js";
import Zone from "./zone.js";
import Units from "../units.js";

export default function(board) {
  const base = findBase();
  const expansions = findExpansions(base);
  const zone = findWallZone(...expansions);

  if (!zone || (zone.r !== 4)) return;

  createWall(zone, findAnchors(board, zone, ...expansions));
}

function createWall(zone, anchors) {
  if (!anchors.direction || !anchors.top || !anchors.bottom) return;

  const bottomX = Math.max(zone.x - 4, anchors.bottom.x - 2);
  const topX = bottomX + 4;

  if ((topX <= anchors.top.x - 3) || (topX > anchors.top.x)) return;

  const x = bottomX + 5;
  const y = anchors.bottom.y - 4;
  const d = anchors.direction.x;
  const center = { x: x - ((d > 0) ? 1 : 0), y: y };
  const pylon = { x: center.x - d * 2, y: center.y, isFree: true };

  const wall = new Hub(pylon.x, pylon.y, 4);
  wall.isWall = true;
  wall.pylonPlots = [pylon];
  wall.buildingPlots = [
    { x: x - 2.5, y: y + 2.5, isFree: true},
    { x: center.x + 2.5 * d, y: center.y + 0.5 * d, isFree: true},
    { x: x + 1.5, y: y - 2.5, isFree: true},
  ];

  if (d > 0) {
    wall.buildingPlots.reverse();
  }

  zone.remove();
}

function findBase() {
  for (const building of Units.buildings().values()) {
    return building;
  }
}

function findExpansions(base) {
  for (const depot of Depot.list()) {
    depot.d = squareDistance(base.body.x, base.body.y, depot.x, depot.y);
  }

  Depot.order();

  return Depot.list().slice(1, 3);
}

function findWallZone(a, b) {
  let closestDistance = Infinity;
  let closestZone;

  for (const zone of Zone.list()) {
    if (!isBetween(zone, a, b)) continue;

    const distance = Math.sqrt(squareDistance(zone.x, zone.y, a.x, a.y)) + Math.sqrt(squareDistance(zone.x, zone.y, b.x, b.y));

    if (distance < closestDistance) {
      closestDistance = distance;
      closestZone = zone;
    }
  }

  return closestZone;
}

function findAnchors(board, zone, a, b) {
  const direction = findDirection(zone, a, b);
  const top = findTopAnchor(board, zone, direction);
  const bottom = findBottomAnchor(board, zone, direction);

  return { direction, top, bottom };
}

function findTopAnchor(board, zone, direction) {
  const y = Math.floor(zone.y - zone.r - 1);
  const d = -direction.x;
  const xx = Math.floor(zone.x);
  const x1 = Math.floor(zone.x - zone.r * d - d);
  const x2 = Math.floor(zone.x + zone.r * d + d);

  if (x1 * x2 * d * d > 0) {
    let anchor;
    let bargain = true;

    for (let x = x1; x !== x2; x += d) {
      if (board.get(x, y) !== " ") anchor = { x, y };
      if (anchor && !bargain) return anchor;
      if (x === xx) bargain = false;
    }
  }
}

function findBottomAnchor(board, zone, direction) {
  const y = Math.floor(zone.y + zone.r);
  const d = -direction.x;
  const xx = Math.floor(zone.x);
  const x1 = Math.floor(zone.x - zone.r * d - d);
  const x2 = Math.floor(zone.x + zone.r * d + d);

  if (x1 * x2 * d * d > 0) {
    let anchor;
    let bargain = true;

    for (let x = x1; x !== x2; x += d) {
      if (board.get(x, y) !== " ") anchor = { x, y };
      if (anchor && !bargain) return anchor;
      if (x === xx) bargain = false;
    }
  }
}

function findDirection(zone, a, b) {
  if (squareDistance(zone.x, zone.y, a.x, a.y) < squareDistance(zone.x, zone.y, b.x, b.y)) {
    return { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
  } else {
    return { x: Math.sign(a.x - b.x), y: Math.sign(a.y - b.y) };
  }
}

function isBetween(zone, a, b) {
  const x1 = Math.min(a.x, b.x);
  const x2 = Math.max(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const y2 = Math.max(a.y, b.y);

  return ((zone.x >= x1) && (zone.x <= x2) && (zone.y >= y1) && (zone.y <= y2));
}

function squareDistance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
