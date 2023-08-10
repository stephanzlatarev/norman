import display from "./display.js";

export default class Battlefield {

  constructor() {
    this.ownMilitary = [...EMPTY_HEATMAP];
    this.ownEconomy = [...EMPTY_HEATMAP];
    this.enemyMilitary = [...EMPTY_HEATMAP];
    this.enemyEconomy = [...EMPTY_HEATMAP];
    this.deployment = [...EMPTY_HEATMAP];
  }

  generate() {
    this.front = createFrontline();
    this.ownPositions = getOwnPositions(this.front);
    this.enemyPositions = getEnemyPositions(this.front);
    this.enemyMilitaryMax = Math.max(Math.random(), 0.2);

    // Populate enemy warriors at frontline
    for (const point of this.enemyPositions.line) {
      this.enemyMilitary[point.spot] = Math.max(this.enemyMilitaryMax * Math.random(), 0.2);
    }
    // Calculate enemy pressure at frontline
    for (const point of this.enemyPositions.line) {
      const pressure = this.enemyMilitary[point.spot];
      if (isAtFrontLine(this.front, point.x + 1, point.y)) this.front.pressure[point.x + 1 + point.y * 10] += pressure;
      if (isAtFrontLine(this.front, point.x, point.y + 1)) this.front.pressure[point.x + point.y * 10 + 10] += pressure;
      if (isAtFrontLine(this.front, point.x + 1, point.y + 1)) this.front.pressure[point.x + 1 + point.y * 10 + 10] += pressure;
    }

    // Populate enemy warriors and economy behind the frontline
    if (this.enemyPositions.base.length) {
      for (let i = 0; i < 2; i++) {
        const mpos = Math.floor(this.enemyPositions.base.length * Math.random());
        this.enemyMilitary[this.enemyPositions.base[mpos].spot] = 1;

        const epos = Math.floor(this.enemyPositions.base.length * Math.random());
        this.enemyEconomy[this.enemyPositions.base[epos].spot] = 1;
      }
    } else {
      this.enemyEconomy[0] = 1;
    }

    // Populate own economy behind the frontline
    if (this.ownPositions.base.length) {
      for (let i = 0; i < 2; i++) {
        const epos = Math.floor(this.ownPositions.base.length * Math.random());
        this.ownEconomy[this.ownPositions.base[epos].spot] = 1;
      }
    } else {
      this.ownEconomy[99] = 1;
    }

    // Calculate optimal counter deployment at frontline
    let maxPressure = 0;
    for (const point of this.ownPositions.line) {
      let pressure = 0;
      if (isAtFrontLine(this.front, point.x - 1, point.y)) pressure += this.front.pressure[point.x - 1 + point.y * 10];
      if (isAtFrontLine(this.front, point.x, point.y - 1)) pressure += this.front.pressure[point.x + point.y * 10 - 10];
      if (isAtFrontLine(this.front, point.x - 1, point.y - 1)) pressure += this.front.pressure[point.x - 1 + point.y * 10 - 10];

      this.front.pressure[point.spot] = pressure;
      maxPressure = Math.max(maxPressure, pressure);
    }
    for (const point of this.ownPositions.line) {
      this.deployment[point.spot] = this.front.pressure[point.spot] / maxPressure;
    }

    return this;
  }

  display() {
    display([...this.ownMilitary, ...this.ownEconomy, ...this.enemyMilitary, ...this.enemyEconomy, ...this.deployment], 10, 10);
  }
}

const HEATMAP_SIZE = 100;
const EMPTY_HEATMAP = heatmap(0);

function heatmap(value) {
  const heatmap = [];

  for (let i = 0; i < HEATMAP_SIZE; i++) {
    heatmap.push(value);
  }

  return heatmap;
}

function createFrontline() {
  const anchor = Math.floor(Math.random() * 8) + 1;
  const center = { x: anchor, y: anchor, spot: anchor + anchor * 10 };

  const line = [center];
  const field = heatmap(null);

  // Stretch left and down
  let point = center;
  while ((point.x > 0) && (point.y < 9)) {
    if (Math.random() < 0.5) {
      // Go left
      point = { x: point.x - 1, y: point.y, spot: point.spot - 1 };
    } else {
      // Go down
      point = { x: point.x, y: point.y + 1, spot: point.spot + 10 };
    }
    line.push(point);
  }
  line.reverse();

  // Stretch right and up
  point = center;
  while ((point.x < 9) && (point.y > 0)) {
    if (Math.random() < 0.5) {
      // Go right
      point = { x: point.x + 1, y: point.y, spot: point.spot + 1 };
    } else {
      // Go up
      point = { x: point.x, y: point.y - 1, spot: point.spot - 10 };
    }
    line.push(point);
  }

  // Mark field
  for (const point of line) {
    field[point.spot] = "x";
  }

  return { line: line, field: field, pressure: heatmap(0) };
}

function getEnemyPositions(front) {
  const base = [];
  const line = [];

  for (let x = 0; x < 10; x++) {
    if (isAtFrontLine(front, x, 0)) break;

    for (let y = 0; y < 10; y++) {
      if (isAtFrontLine(front, x, y)) break;

      const point = { x: x, y: y, spot: x + y * 10 };
      if (isAtFrontLine(front, x + 1, y) || isAtFrontLine(front, x, y + 1)) {
        line.push(point);
      } else {
        base.push(point);
      }
    }
  }

  return { line: line, base: base };
}

function getOwnPositions(front) {
  const base = [];
  const line = [];

  for (let x = 9; x >= 0; x--) {
    if (isAtFrontLine(front, x, 9)) break;

    for (let y = 9; y >= 0; y--) {
      if (isAtFrontLine(front, x, y)) break;

      const point = { x: x, y: y, spot: x + y * 10 };
      if (isAtFrontLine(front, x - 1, y) || isAtFrontLine(front, x, y - 1)) {
        line.push(point);
      } else {
        base.push(point);
      }
    }
  }

  return { line: line, base: base };
}

function isAtFrontLine(front, x, y) {
  if ((x < 0) || (x >= 10) || (y < 0) || (y >= 10)) return false;

  return (front.field[x + y * 10] === "x");
}
