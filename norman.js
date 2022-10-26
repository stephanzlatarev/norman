import { Game } from "./src/starcraft/game.js";
import log from "./src/log.js";

let running = true;

process.on("SIGTERM", function() {
  log("Stopping...");
  running = false;
});

async function run() {
  const game = new Game(process.argv);

  log("Hello!");
  await game.start();

  let hasGreetedOpponent = false;

  while (running) {
    if (!hasGreetedOpponent && (game.time() > 10)) {
      await game.chat("Good luck!");
      hasGreetedOpponent = true;
    }

    if (game.minerals() > 300) {
      await game.chat("gg");
      running = false;
    }

    await game.step();
  }

  await game.quit();
  log("Bye!");
}

run().catch(error => log("ERROR:", error.message));
