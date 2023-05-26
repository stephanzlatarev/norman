import Game from "./game.js";
import display from "./display.js";

const DEPLOYMENT = [];
empty(DEPLOYMENT);
DEPLOYMENT[0] = 10;
DEPLOYMENT[8] = 10;
DEPLOYMENT[49] = 10;
DEPLOYMENT[80] = 10;
DEPLOYMENT[94] = 10;

const player = {
  start: a => a,
  deploy: () => DEPLOYMENT,
};
const opponent = {
  start: a=>a,
  deploy: a=>a
};

function empty(array) {
  array.length = 100;
  for (let i = 0; i < array.length; i++) array[i] = 0;
}

async function test() {
  const game = new Game(player, opponent);
  game.start();
  empty(game.player1.economy);
  empty(game.player1.military);
  game.player1.military[44] = 50;

  display(game.player1.military, 0, 0);
  display(DEPLOYMENT, 1, 0);

  for (let step = 1; step < 5; step++) {
    await game.step();

    display(game.player1.military, 0, step);
    display(DEPLOYMENT, 1, step);
  }
}

test();
