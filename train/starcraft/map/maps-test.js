import { spawn } from "child_process";
import starcraft from "@node-sc2/proto";
import Map from "../../../body/starcraft/map.js";

const GAME_CONFIG = {
  localMap: { mapPath: "BerlingradAIE.SC2Map" },
  path: "C:\\games\\StarCraft II",
  version: "Base89165",
  realtime: false,
  playerSetup: [
    { type: 1, race: 3 },
    { type: 2, race: 4, difficulty: 1 }
  ]
};

const client = starcraft();

async function go() {
  await startGame();
  await client.step({ count: 1 });

  const map = new Map(await client.gameInfo(), await client.observation());

  for (const line of map.map()) {
    console.log(line);
  }

  await client.quit();
}

async function startGame() {
  console.log("Starting StarCraft II game...");

  spawn("..\\Versions\\" + GAME_CONFIG.version + "\\SC2.exe", [
    "-displaymode", "0", "-windowx", "0", "-windowy", "0",
    "-windowwidth", "1920", "-windowwidth", "1440",
    "-listen", "127.0.0.1", "-port", "5000"
  ], {
    cwd: GAME_CONFIG.path + "\\Support"
  });

  for (let i = 0; i < 12; i++) {
    try {
      await client.connect({ host: "localhost", port: 5000 });
      break;
    } catch (_) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  await client.createGame(GAME_CONFIG);

  await client.joinGame({
    race: GAME_CONFIG.playerSetup[0].race,
    options: { raw: true },
  });
}

go();
