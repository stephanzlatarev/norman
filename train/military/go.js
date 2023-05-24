import display from "./display.js";
import Game from "./game.js";
import Player from "./random.js";

const game = new Game(new Player(), new Player());
let time = 0;

function show(game) {
  display(game.player1.military, 0, 0);
  display(game.player2.military, 1, 0);
  display(game.player1.economy, 0, 1);
  display(game.player2.economy, 1, 1);
}

game.start();

while (!game.winner()) {
  game.step();

  const now = Date.now();
  if (now > time + 100) {
    show(game);
    time = now;
  }
}

show(game);
console.log("Player", game.winner(), "wins! Game loops:", game.time);
