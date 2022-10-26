import { spawn } from "child_process";
import log from "./log.js";

export default async function(client) {
  log("Starting StarCraft II game...");

  spawn("..\\Versions\\Base88500\\SC2.exe", [
    "-displaymode", "0", "-windowx", "0", "-windowy", "0",
    "-windowwidth", "1920", "-windowwidth", "1440", // Alternatively, width: 1920 height: 1080/1200/1440 (1680/1050)
    "-listen", "127.0.0.1", "-port", "5000"
  ], {
    cwd: "C:\\games\\StarCraft II\\Support"
  });

  for (let i = 0; i < 12; i++) {
    try {
      await client.connect({ host: "localhost", port: 5000 });
      await client.createGame({
        realtime: "true",
        battlenetMapName: "Data-C",
        playerSetup: [
          { type: 1, race: 3 },                  // Participant, Protoss
          { type: 2, race: 4, difficulty: 1 },   // Computer, Random
        ]
      });

      log("Game started.");
      return;
    } catch (_) {
      await sleep(5);
    }
  }

  throw "Unable to start game!";
}

async function sleep(seconds) {
  await new Promise(r => setTimeout(r, seconds * 1000));
}
