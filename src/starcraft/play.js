import { Game } from "./game.js";

let isRunning = true;

export async function start(args) {
  const game = new Game(args);

  await game.start();

  let hasGreetedOpponent = false;

  while (isRunning) {
    if (!hasGreetedOpponent && (game.time() > 10)) {
      await game.chat("Good luck!");
      hasGreetedOpponent = true;
    }

    if (game.minerals() > 300) {
      await game.chat("gg");
      isRunning = false;
    }

    await game.step();
  }

  await game.quit();
}

export function stop() {
  isRunning = false;
}
