import { spawn } from "child_process";
import starcraft from "@node-sc2/proto";
import { MAP, store } from "./maps.js";

const GAME_CONFIG = {
  path: "C:\\games\\StarCraft II",
  version: "Base89720",
  realtime: false,
  localMap: { mapPath: MAP + ".SC2Map" },
  playerSetup: [
    { type: 1, race: 3 },
    { type: 2, race: 4, difficulty: 1 }
  ]
};

const client = starcraft();

async function go() {
  await startGame();
  await client.step({ count: 1 });

  const gameInfo = await client.gameInfo();
  const observation = await client.observation();

  const units = observation.observation.rawData.units.filter(unit => (unit.owner !== 1) && (unit.owner !== 2)).map(unit => ({
    unitType: unit.unitType,
    radius: unit.radius,
    pos: {
      x: unit.pos.x,
      y: unit.pos.y,
    }
  }));
  const map = [];

  const size = gameInfo.startRaw.placementGrid.size;
  const grid = gameInfo.startRaw.placementGrid.data;
  for (let y = 0; y < size.y; y++) {
    const line = [];
    for (let x = 0; x < size.x; x++) {
      const index = x + y * size.x;
      const bit = grid[Math.floor(index / 8)];
      const pos = 7 - index % 8;
      const mask = 1 << pos;
      const val = (bit & mask) != 0;

      if (val) {
        line.push(" ");
      } else {
        line.push("-");
      }
    }
    map.push(line.join(""));
    console.log(line.join(""));
  }

  store({ grid: gameInfo.startRaw.placementGrid, units: units });

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
