import Game from "./game.js";
import Robot from "./robot.js";
import { show } from "./display.js";

const MIN_PLAY_TIME_MILLIS = 30000;
const GAME_TIME_LIMIT = 20;
const GAME_BOARDS = 100;

const incumbent = new Robot("Incumbent");
let challenger = new Robot("Challenger", 5 / GAME_TIME_LIMIT);

challenger.watch(show);

let drilling = true;

async function drill() {
  let scoreToBeat = await test(challenger);

  while (drilling) {
    const stats = await play(challenger);

    stats.bestPlay.display();

    console.log("Best game score:", scoreSummary(stats.bestPlay.score()), "     ");
    console.log("Score to beat  :", scoreSummary(scoreToBeat), "     ");
    console.log();
    console.log("Play time:", stats.playTime, "millis", "      ");
    console.log("Games:", stats.playCount, "      ");
    console.log("Win ratio:", (stats.wins * 100 / stats.playCount).toFixed(0) + "%", "      ");
    console.log("Average score:", scoreSummary(stats.scoreAverage), "     ");
    console.log("90th percentile score:", scoreSummary(stats.scorePercentile), "     ");
    console.log();
    console.log();

    if (stats.bestPlay.score() < scoreToBeat) {
      const clone = await challenger.clone();

      const studyTime = Date.now();
      await clone.study([stats.bestPlay.log(2)]);

      console.log("Study time:", (Date.now() - studyTime), "millis", "      ");
      console.log("Brain:", clone.brain.summary, "     ");
      console.log("                                                          ");

      const improvementScore = await test(clone);

      console.log("Did study improve challenger?", scoreSummary(improvementScore), "vs", scoreSummary(scoreToBeat), "->", (improvementScore < scoreToBeat), "     ");
      if (improvementScore < scoreToBeat) {
        await clone.brain.save();

        challenger = clone;
        scoreToBeat = improvementScore;
      }
    } else {
      console.log(Date.now(), "                                              ");
      console.log("                                                          ");
      console.log("                                                          ");
      console.log("                                                          ");
      console.log("                                                          ");
    }
  }
}

async function play(robot) {
  const startTime = Date.now();
  const scores = [];
  let bestPlay;

  while (Date.now() - startTime < MIN_PLAY_TIME_MILLIS) {
    const game = new Game(incumbent, robot, GAME_BOARDS);
    robot.randomness = Math.random();
    scores.push(...(await game.play(GAME_TIME_LIMIT)));

    const currentBestPlay = findBestPlay(game.boards);
    currentBestPlay.display();

    if (!bestPlay || (currentBestPlay.score() < bestPlay.score())) {
      bestPlay = currentBestPlay;
      console.log("Best game score:", scoreSummary(bestPlay.score()), "     ");
    }
  }

  return {
    playTime: Date.now() - startTime,
    playCount: scores.length,
    scoreAverage: scores.reduce((current, score) => (current + score / scores.length), 0),
    scorePercentile: scores.sort()[Math.floor(scores.length / 10)],
    wins: scores.reduce((wins, score) => ((score < 0) ? wins + 1 : wins), 0),
    bestPlay: bestPlay,
  };
}

async function test(robot) {
  const randomness = robot.randomness;

  robot.randomness = 0;
  const score = (await new Game(incumbent, robot, 1).play(GAME_TIME_LIMIT))[0];

  robot.randomness = randomness;
  return score;
}

function scoreSummary(score) {
  return (score < 0) ? (-score).toFixed(2) + " winning" : score.toFixed(2) + " losing";
}

function findBestPlay(boards) {
  let bestPlay;
  let bestScore = Infinity;

  for (const board of boards) {
    if (board.score() < bestScore) {
      bestPlay = board;
      bestScore = board.score();
    }
  }

  return bestPlay;
}

function scriptAllInAttack(log) {
  for (const one of log) {
    let sum = 0;
    for (let i = 0; i < one.output.length; i++) {
      sum += one.output[i];
      one.output[i] = 0;
    }

    one.output[33] = sum;
  }

  return log;
}

process.stdin.on("keypress", (_, key) => {
  if (key.name === "escape") {
    drilling = false;
  }
});
console.log("Press Esc to leave");

drill();
