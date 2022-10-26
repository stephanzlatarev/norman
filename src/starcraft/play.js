import { Game } from "./game.js";

let game;
let isRunning = true;
let hasGreetedOpponent = false;

export async function start(args) {
  game = new Game(args);
  isRunning = true;

  await game.start();

  while (isRunning) {
    await checkGreet();
    await checkBuildWorker();
    await checkEnd();

    await game.step();
  }

  await game.quit();
}

export function stop() {
  isRunning = false;
}

async function checkGreet() {
  if (!hasGreetedOpponent && (game.time() > 10)) {
    await game.chat("Good luck!");
    hasGreetedOpponent = true;
  }
}

async function checkEnd() {
  if (game.minerals() > 300) {
    await game.chat("gg");
    isRunning = false;
  }
}

async function checkBuildWorker() {
  if ((game.minerals() >= 50) && (game.energyUse() < game.energySupply())) {
    await game.train("probe");
  }
}
