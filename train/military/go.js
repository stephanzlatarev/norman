import Game from "./game.js";
import Player from "./random.js";

const game = new Game(new Player(), new Player(), 100);

async function go() {
  while (true) {
    const scores = await game.play(500);
    const wins = scores.reduce((wins, score) => ((score > 0) ? wins + 1 : wins), 0);

    game.display();
    console.log("Win ratio", wins, "percent");
  }
}

go();
