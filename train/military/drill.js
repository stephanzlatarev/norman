import Game from "./game.js";
import Robot from "./robot.js";

const incumbent = new Robot("Incumbent");
const challenger = new Robot("Challenger", 2000, 0.2);

let game = new Game(incumbent, challenger);

async function drill() {
  let scoreToBeat = Infinity;

  while (game) {
    const score = await game.play(500);

    if (score) {
      show(game, score);

      if (score < scoreToBeat) {
        console.log("Study game:", score);
        await challenger.study();
        scoreToBeat = score;
      }
    }
  }
}

function show(game, score) {
  game.display();

  console.log();
  console.log("Challenger:", challenger.brain.summary);

  if (score > 0) {
    console.log("Winner:", game.player1.name, "| score:", score.toFixed(2), "                    ");
  } else if (score < 0) {
    console.log("Winner:", game.player2.name, "| score:", -score.toFixed(2), "                    ");
  }
}

process.stdin.on("keypress", (_, key) => {
  if (key.name === "escape") {
    game = false;
  }
});
console.log("Press Esc to leave");

drill();
