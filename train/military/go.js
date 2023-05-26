import Game from "./game.js";
import Player from "./random.js";

const game = new Game(new Player(), new Player());

let wins = 0;
let matches = 0;

async function go() {
  while (true) {
    const score = await game.play(500);

    if (score) {
      matches++;
      if (score > 0) wins++;

      game.display();
      console.log("Win ratio", (wins * 100 / matches), "percent");
    }
  }
}

go();
