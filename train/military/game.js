import display from "./display.js";
import move from "./flows.js";

const DAMAGE = 0.2;
const SPAWN = 0.1;

const BOARD_MILITARY_1 = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];
const BOARD_ECONOMY_1 = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 0, 1, 0, 1, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 0, 1, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];
const BOARD_MILITARY_2 = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];
const BOARD_ECONOMY_2 = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 1, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 1, 0, 1, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 1, 0, 1, 0, 1, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

export default class Game {

  constructor(player1, player2, parallelBoardsCount) {
    this.time = 0;
    this.player1 = player1;
    this.player2 = player2;

    const boardsCount = parallelBoardsCount ? parallelBoardsCount : 1;
    this.boards = [];
    for (let i = 0; i < boardsCount; i++) {
      this.boards.push(new Board());
    }
  }

  async play(limit) {
    this.start();

    while (this.time <= limit) {
      await this.step();
    }

    return this.boards.map(board => board.score());
  }

  start() {
    this.time = 0;

    for (const board of this.boards) {
      board.init();
    }
  }

  async step() {
    const shouldSpawn = (this.time % 10 === 0);
    for (const board of this.boards) {
      board.step(shouldSpawn);
    }

    const deployments1 = await this.player1.play(this.boards.map(board => board.view(1)));
    const deployments2 = await this.player2.play(this.boards.map(board => board.view(2)));

    for (let i = 0; i < this.boards.length; i++) {
      this.boards[i].move(deployments1[i], deployments2[i]);
    }

    this.time++;
  }

  log(player, scoreThreshold) {
    const list = [];

    for (const board of this.boards) {
      const score = board.score();
      if (
        ((player === 1) && (score >= scoreThreshold)) ||
        ((player === 2) && (score <= scoreThreshold))
      ) {
        list.push(board.log(player));
      }
    }

    return list;
  }

  display() {
    if (this.boards.length) {
      this.boards[0].display();
    }
  }
}

class Board {

  init() {
    this.time = 0;
    this.log1 = [];
    this.log2 = [];
    this.thescore = 0;

    this.military1 = [...BOARD_MILITARY_1];
    this.economy1 = [...BOARD_ECONOMY_1];
    this.military2 = [...BOARD_MILITARY_2];
    this.economy2 = [...BOARD_ECONOMY_2];
  }

  step(shouldSpawn) {
    for (let spot = 0; spot < 100; spot++) {
      const military1 = this.military1[spot];
      const economy1 = this.economy1[spot];
      const military2 = this.military2[spot];
      const economy2 = this.economy2[spot];
  
      if (military1 && military2) {
        const damage = Math.max(military1, military2) * DAMAGE;
  
        this.military1[spot] = round(military1 - damage);
        this.military2[spot] = round(military2 - damage);
      } else if (military1 && economy2) {
        this.economy2[spot] = round(economy2 - military1 * DAMAGE);
      } else if (military2 && economy1) {
        this.economy1[spot] = round(economy1 - military2 * DAMAGE);
      }

      if (shouldSpawn) {
        if (economy1) {
          this.military1[spot] += Math.floor(economy1);
          this.economy1[spot] += economy1 * SPAWN;
        }
        if (economy2) {
          this.military2[spot] += Math.floor(economy2);
          this.economy2[spot] += economy2 * SPAWN;
        }
      }
    }
  }

  view(player) {
    if (player === 1) {
      return [...this.military1, ...this.economy1, ...this.military2, ...this.economy2];
    } else if (player === 2) {
      return [...this.military2, ...this.economy2, ...this.military1, ...this.economy1];
    }
  }

  log(player) {
    if (player === 1) {
      return this.log1;
    } else if (player === 2) {
      return this.log2;
    }
  }

  move(deployment1, deployment2) {
    const input1 = this.view(1);
    const input2 = this.view(2);

    this.military1 = move(this.military1, deployment1);
    this.military2 = move(this.military2, deployment2);

    this.log1.push({ input: input1, output: [...this.military1] });
    this.log2.push({ input: input2, output: [...this.military2] });
  }

  score() {
    if (!this.thescore) {
      this.thescore = 0;

      for (const one of this.economy1) if (one > 0) this.thescore += one;
      for (const one of this.military1) if (one > 0) this.thescore += one;

      for (const one of this.economy2) if (one > 0) this.thescore -= one;
      for (const one of this.military2) if (one > 0) this.thescore -= one;
    }

    return this.thescore;
  }

  display() {
    display(this.military1, 0, 0);
    display(this.military2, 1, 0);
    display(this.economy1, 0, 1);
    display(this.economy2, 1, 1);
  }

}

function round(value) {
  return Math.max(Math.floor(value * 10) / 10, 0);
}
