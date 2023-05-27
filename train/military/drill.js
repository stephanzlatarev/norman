import Game from "./game.js";
import Robot from "./robot.js";

const GAME_TIME_LIMIT = 500;
const GAME_BOARDS = 100;

const incumbent = new Robot("Incumbent");
const challenger = new Robot("Challenger", 5 / GAME_TIME_LIMIT);

let game = new Game(incumbent, challenger, GAME_BOARDS);

async function drill() {
  let scoreToBeat = Infinity;

  while (game) {
    const playTime = Date.now();
    const scores = await game.play(GAME_TIME_LIMIT);
    const scoreAverage = scores.reduce((current, score) => (current + score / scores.length), 0);
    const scorePercentile = scores.sort()[10];
    const wins = scores.reduce((wins, score) => ((score < 0) ? wins + 1 : wins), 0);

    scoreToBeat = Math.min(scoreToBeat, scorePercentile);

    game.display();
    console.log();
    console.log("Games:", scores.length, "      ");
    console.log("Play time:", (Date.now() - playTime), "millis", "      ");
    console.log();
    console.log(" === Incumbent ===");
    console.log("Win ratio:", (wins * 100 / GAME_BOARDS).toFixed(0) + "%", "      ");
    console.log("Average score:", (scoreAverage < 0) ? (-scoreAverage).toFixed(2) + " winning" : scoreAverage.toFixed(2) + " losing", "     ");
    console.log("90th percentile score:", (scorePercentile < 0) ? (-scorePercentile).toFixed(2) + " winning" : scorePercentile.toFixed(2) + " losing", "     ");
    console.log("Score to beat:", (scoreToBeat < 0) ? (-scoreToBeat).toFixed(2) + " winning" : scoreToBeat.toFixed(2) + " losing", "     ");

    const studyTime = Date.now();
    await challenger.study(game.log(2, scoreToBeat));

    console.log("Study time:", (Date.now() - studyTime), "millis", "      ");
    console.log("Brain:", challenger.brain.summary, "     ");
  }
}

process.stdin.on("keypress", (_, key) => {
  if (key.name === "escape") {
    game = false;
  }
});
console.log("Press Esc to leave");

drill();
