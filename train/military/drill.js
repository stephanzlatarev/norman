import display from "./display.js";
import Memory from "../memory.js";
import Game from "./game.js";
import Random from "./random.js";
import Robot from "./robot.js";

let drilling = true;
let time = 0;

process.stdin.on("keypress", (_, key) => {
  if (key.name === "escape") {
    drilling = false;
  }
});
console.log("Press Esc to leave");

const memory = new Memory(10000).load("./train/military/samples.json");
const robot1 = new Robot("Robot 1", memory);
const robot2 = new Robot("Robot 2", memory);
const random1 = new Random("Random 1");
const random2 = new Random("Random 2");
const log1 = [];
const log2 = [];

async function drill() {
  while (drilling) {
    const winners = [];
    const samples = createSamples(winners);

    for (const sample of samples) {
      memory.add(sample.input, sample.output, sample.score);
    }
    memory.store("./train/military/samples.json");

    for (let i = 0; i < 20; i++) console.log();
    console.log("Winners:", winners.join(" | "), "                    ");

    await robot1.study();
  }
}

function createSamples(winners) {
  return [
    ...play(random1, robot2, winners),
    ...play(robot1, random2, winners),
    ...play(robot1, robot2, winners),
  ];
}

function show(game) {
  display(game.player1.military, 0, 0);
  display(game.player2.military, 1, 0);
  display(game.player1.economy, 0, 1);
  display(game.player2.economy, 1, 1);
}

function play(player1, player2, winners) {
  const game = new Game(player1, player2);

  game.start();

  log1.length = 0;
  log2.length = 0;

  while (!game.winner() && (game.time < 500)) {
    const input1 = [...game.player1.military, ...game.player1.economy, ...game.player2.military, ...game.player2.economy];
    const input2 = [...game.player2.military, ...game.player2.economy, ...game.player1.military, ...game.player1.economy];

    game.step();

    const now = Date.now();
    if (now > time + 100) {
      show(game);
      time = now;
    }

    log1.push({ input: input1, output: [...game.player1.military] });
    log2.push({ input: input2, output: [...game.player2.military] });
  }

  let winningLog = [];
  if (game.winner() === 1) {
    winningLog = log1;
    winners.push(player1.name);
  } else if (game.winner() === 2) {
    winningLog = log2;
    winners.push(player2.name);
  } else {
    winners.push("Nobody");
  }
  show(game);

  const score = 1000 - game.time;
  for (const sample of winningLog) sample.score = score;

  return winningLog;
}

drill();
