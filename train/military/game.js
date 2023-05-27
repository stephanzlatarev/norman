import display from "./display.js";
import move from "./flows.js";

const DAMAGE = 0.2;
const SPAWN = 0.1;

export default class Game {

  constructor(player1, player2) {
    this.time = 0;
    this.player1 = player1;
    this.player2 = player2;
  }

  async play(limit) {
    this.start();

    while (this.time <= limit) {
      await this.step();
    }

    return this.score();
  }

  start() {
    this.time = 0;

    this.player1.start();
    this.player1.military = field();
    this.player1.economy = field();
    this.player1.economy[coordinates(1, 1)] = 1;
    this.player1.economy[coordinates(1, 3)] = 1;
    this.player1.economy[coordinates(1, 5)] = 1;
    this.player1.economy[coordinates(3, 1)] = 1;
    this.player1.economy[coordinates(3, 3)] = 1;
    this.player1.economy[coordinates(5, 1)] = 1;

    this.player2.start();
    this.player2.military = field();
    this.player2.economy = field();
    this.player2.economy[coordinates(8, 8)] = 1;
    this.player2.economy[coordinates(8, 6)] = 1;
    this.player2.economy[coordinates(8, 4)] = 1;
    this.player2.economy[coordinates(6, 8)] = 1;
    this.player2.economy[coordinates(6, 6)] = 1;
    this.player2.economy[coordinates(4, 8)] = 1;
  }

  async step() {
    for (let spot = 0; spot < 100; spot++) {
      fight(this.player1, this.player2, spot);
    }

    if (this.time % 10 === 0) {
      for (let spot = 0; spot < 100; spot++) {
        if (this.player1.economy[spot]) {
          this.player1.military[spot] += Math.floor(this.player1.economy[spot]);
          this.player1.economy[spot] += this.player1.economy[spot] * SPAWN;
        }
        if (this.player2.economy[spot]) {
          this.player2.military[spot] += Math.floor(this.player2.economy[spot]);
          this.player2.economy[spot] += this.player2.economy[spot] * SPAWN;
        }
      }
    }

    const deployment1 = await this.player1.deploy(this.player1.military, this.player1.economy, this.player2.military, this.player2.economy);
    const deployment2 = await this.player2.deploy(this.player2.military, this.player2.economy, this.player1.military, this.player1.economy);

    this.player1.military = move(this.player1.military, deployment1);
    this.player2.military = move(this.player2.military, deployment2);

    this.time++;
  }

  score() {
    let score = 0;

    for (const one of this.player1.economy) if (one > 0) score += one;
    for (const one of this.player1.military) if (one > 0) score += one;

    for (const one of this.player2.economy) if (one > 0) score -= one;
    for (const one of this.player2.military) if (one > 0) score -= one;

    return score;
  }

  display() {
    display(this.player1.military, 0, 0);
    display(this.player2.military, 1, 0);
    display(this.player1.economy, 0, 1);
    display(this.player2.economy, 1, 1);
  }
}

function field() {
  const field = [];

  for (let i = 0; i < 100; i++) {
    field.push(0);
  }

  return field;
}

function coordinates(x, y) {
  return x + y * 10;
}

function fight(player1, player2, spot) {
  const military1 = player1.military[spot];
  const economy1 = player1.economy[spot];
  const military2 = player2.military[spot];
  const economy2 = player2.economy[spot];

  if (military1 && military2) {
    // Fight between warriors
    const damage = Math.max(military1, military2) * DAMAGE;

    player1.military[spot] = round(military1 - damage);
    player2.military[spot] = round(military2 - damage);
  } else if (military1 && economy2) {
    const damage = military1 * DAMAGE;

    if (damage > economy2) {
      player2.economy[spot] = 0;
    } else {
      player2.economy[spot] -= damage;
    }
  } else if (military2 && economy1) {
    const damage = military2 * DAMAGE;

    if (damage > economy1) {
      player1.economy[spot] = 0;
    } else {
      player1.economy[spot] -= damage;
    }
  }
}

function round(value) {
  return Math.max(Math.floor(value * 10) / 10, 0);
}
