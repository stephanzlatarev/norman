import Game from "./game.js";
import Robot from "./robot.js";

const incumbent = new Robot("Incumbent");
const challenger = new Robot("Challenger", 10000, 5 / 500);

let game = new Game(incumbent, challenger);
let totalGames = 0;
let scores = [];

let time = Date.now();

async function drill() {
  while (game) {
    const score = await game.play(500);
    totalGames++;

    scores.push(score);
    if (scores.length > 100) scores.splice(0, 1);

    if (Date.now() - time >= 500) {
      show();
      time = Date.now();
    }

    if (score < average()) {
      await challenger.study();
    }
  }
}

function average() {
  let result = 0;
  for (const score of scores) {
    result += score / scores.length;
  }
  return result;
}

function won() {
  let result = 0;
  for (const score of scores) {
    if (score < 0) result++;
  }
  return result;
}

function show() {
  const scoreAverage = average();
  const gamesWon = won();

  game.display();
  console.log();
  console.log("Game score: ", game.score().toFixed(2), "     ");

  console.log();
  console.log(" === Challenger ===");
  console.log("Wins: ", gamesWon, "/", scores.length, "of", totalGames, "games       ");
  console.log("Score:", (scoreAverage < 0) ? (-scoreAverage).toFixed(2) + " winning" : scoreAverage.toFixed(2) + " losing", "     ");
  console.log("Moves:", challenger.experiments.length, "/", challenger.log.length, "     ");
  console.log("Brain:", challenger.brain.summary, "     ");
  console.log();
}

process.stdin.on("keypress", (_, key) => {
  if (key.name === "escape") {
    game = false;
  }
});
console.log("Press Esc to leave");

drill();
