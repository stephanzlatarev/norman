import { spawn } from "child_process";
import starcraft from "@node-sc2/proto";
import { default as GameMap } from "../../../body/starcraft/map/map.js";
import Economy from "./economy.js";

const print = console.log;

const GAME_CONFIG = {
  path: "C:\\games\\StarCraft II",
  "version": "Base90136",
  realtime: false,
  "localMap": { "mapPath": "mining.SC2Map" },
  playerSetup: [
    { type: 1, race: 3 },
    { type: 2, race: 2, difficulty: 1 }
  ]
};
const SLOW_DOWN = 0;

const client = starcraft();
let time = 0;

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

function clock() {
  const seconds = Math.floor(time / 22.4);
  const minutes = Math.floor(seconds / 60);
  return twodigits(minutes) + ":" + twodigits(seconds % 60) + "/" + time;
}

function twodigits(value) {
  if (value < 10) return "0" + value;
  return value;
}

async function go() {
  await startGame();

  console.log = function() { print(clock(), ...arguments); };

  await client.step({ count: 1 });
  const observation = (await client.observation()).observation;
  const map = new GameMap(await client.gameInfo(), observation);
  const base = observation.rawData.units.find(unit => (unit.unitType === 59));
  const economy = new Economy(client, map, base);

  while (true) {
    const observation = (await client.observation()).observation;

    time = observation.gameLoop;

    const units = new Map();
    const enemies = new Map();
    const resources = new Map();
    for (const unit of observation.rawData.units) {
      if (unit.owner === 1) {
        units.set(unit.tag, unit);
      } else if (unit.owner === 2) {
        enemies.set(unit.tag, unit);
      } else {
        resources.set(unit.tag, unit);
      }
    }

    await economy.run(time, observation, units, resources, enemies);

    if (SLOW_DOWN) await new Promise(r => setTimeout(r, SLOW_DOWN));

    await client.step({ count: 1 });
  }
}

go();
