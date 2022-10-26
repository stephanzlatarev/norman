import { start, stop } from "./src/starcraft/play.js";
import log from "./src/log.js";

process.on("SIGTERM", function() {
  log("Stopping...");

  stop();
});

async function run() {
  log("Hello!");

  await start(process.argv);

  log("Bye!");
}

run().catch(error => log("ERROR:", error.message));
