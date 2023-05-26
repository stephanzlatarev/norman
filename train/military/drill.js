import Game from "./game.js";
import Robot from "./robot.js";

const incumbent = new Robot("Incumbent");
const challenger = new Robot("Challenger", 2000, 0.2);

let game = new Game(incumbent, challenger);
let scores = [];

let time = Date.now();

async function drill() {
  while (game) {
    const score = await game.play(500);

    if (score < average()) {
      await challenger.study();
    }

    scores.push(score);
    if (scores.length > 100) scores.splice(0, 1);

    if (Date.now() - time >= 500) {
      show();
      time = Date.now();
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
  console.log(`Wins: ${gamesWon}/${scores.length} (${(gamesWon * 100 / scores.length).toFixed(2)}%)    `);
  console.log("Score:", (scoreAverage < 0) ? (-scoreAverage).toFixed(2) + " winning" : scoreAverage.toFixed(2) + " losing", "     ");
  console.log("Brain:", challenger.brain.summary, "     ");
}

process.stdin.on("keypress", (_, key) => {
  if (key.name === "escape") {
    game = false;
  }
});
console.log("Press Esc to leave");

drill();
