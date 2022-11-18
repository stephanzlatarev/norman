import { start, stop } from "./body/starcraft/play.js";
import log from "./body/nodejs/log.js";

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
