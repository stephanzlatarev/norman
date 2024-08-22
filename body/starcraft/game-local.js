import { spawn } from "child_process";
import fs from "fs";
import readline from "readline";
import Game from "./game.js";
import Trace from "./trace.js";

const SIMULATION_FILE = "./body/starcraft/simulation.js";
const SIMULATION_CODE = `
let done = false;

export default async function simulate(client) {
  if (done) return;

  const gameInfo = await client.gameInfo();
  const observation = await client.observation();
  const base = gameInfo.startRaw.startLocations[0];

  if (meta.map !== gameInfo.mapName) {
    console.log("The simulation must run on map ", meta.map);
    process.exit();
  }
  if ((meta.x !== base.x) || (meta.x !== base.x)) {
    console.log("The simulation must run with the other start location! Start location is random. Try it again.");
    process.exit();
  }

  const extras = observation.observation.rawData.units.filter(function(unit) {
    if ((unit.owner !== 1) && (unit.owner !== 2)) return false;
    return !units.find(one => ((unit.pos.x === one.x) && (unit.pos.y === one.y)));
  });
  await client.debug({ debug: [{ killUnit: { tag: extras.map(unit => Number(unit.tag)) } }] });

  for (const unit of units) {
    if (observation.observation.rawData.units.find(one => ((one.pos.x === unit.x) && (one.pos.y === unit.y)))) continue;

    await client.debug({
      debug: [{
        createUnit: {
          unitType: unit.type,
          owner: unit.owner,
          pos: { x: unit.x, y: unit.y },
          quantity: 1,
        }
      }]
    });
  }

  await client.step(1);

  done = true;
}
`;

let speed = 0;
let paused = false;
let takingSnapshot = false;

export default class LocalGame extends Game {

  constructor(config) {
    super();

    this.config = config;
    this.trace = new Trace();
  }

  async connect() {
    console.log("Starting StarCraft II game...");

    spawn("..\\Versions\\" + this.config.version + "\\SC2_x64.exe", [
      "-displaymode", "0", "-windowx", "0", "-windowy", "0", "-windowwidth", "2500",
      "-listen", "127.0.0.1", "-port", "5000"
    ], {
      cwd: this.config.path + "\\Support64"
    });

    for (let i = 0; i < 12; i++) {
      try {
        await this.client.connect({ host: "127.0.0.1", port: 5000 });
        break;
      } catch (_) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    await this.client.createGame(this.config);

    await this.client.joinGame({
      race: this.config.playerSetup[0].race,
      options: { raw: true },
    });

    if (fs.existsSync(SIMULATION_FILE)) {
      const module = await import("./simulation.js");
      this.simulation = module.default;

      console.log("Creating simulation...");
      await this.simulation(this.client);
      console.log("Simulation ready.");

      paused = true;
      console.log("Game paused!");
    }
  }

  async step() {
    if (takingSnapshot) {
      await save(this.client);
      takingSnapshot = false;
    }

    await this.trace.step(this.client);
    await super.step();

    if (paused) {
      return new Promise(async function(resolve) {
        while (paused) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        resolve();
      });
    } else if (speed) {
      await new Promise(resolve => setTimeout(resolve, speed));
    }

    if (this.simulation) {
      await this.simulation(this.client);
    }
  }

}

function pause() {
  if (paused) {
    paused = false;
    console.log("Game resumed.");
  } else {
    paused = true;
    console.log("Game paused!");
  }
}

function slow(value) {
  speed = Number(value) * 100;

  if (speed) {
    console.log("Game speed", speed, "millis per loop."); 
  } else {
    console.log("Game speed - normal.");
  }
}

async function save(client) {
  const gameInfo = await client.gameInfo();
  const base = gameInfo.startRaw.startLocations[0];
  const meta = `const meta = { map: "${gameInfo.mapName}", x: ${base.x}, y: ${base.y} };`;
  const existing = new Set();

  for (const unit of (await client.observation()).observation.rawData.units) {
    existing.add(unit.tag);
  }

  for (let x = gameInfo.startRaw.playableArea.p0.x; x <= gameInfo.startRaw.playableArea.p1.x; x += 5) {
    const addObservers = [];
    for (let y = gameInfo.startRaw.playableArea.p0.y; y <= gameInfo.startRaw.playableArea.p1.y; y += 5) {
      addObservers.push({ createUnit: { unitType: 82, owner: 1, pos: { x: x, y: y }, quantity: 1 } });
    }
    await client.debug({ debug: addObservers });
  }

  await client.step(1);
  await client.step(1);
  await client.step(1);

  const observation = await client.observation();
  const units = ["const units = ["];
  for (const unit of observation.observation.rawData.units) {
    if (((unit.owner === 1) && existing.has(unit.tag)) || (unit.owner === 2)) {
      units.push(`  { owner: ${unit.owner}, type: ${unit.unitType}, x: ${unit.pos.x}, y: ${unit.pos.y} },`);
    }
  }
  units.push("];");

  const removeObservers = [];
  for (const unit of observation.observation.rawData.units) {
    if ((unit.unitType === 82) && !existing.has(unit.tag)) {
      removeObservers.push(Number(unit.tag));
    }
  }
  await client.debug({ debug: [{ killUnit: { tag: removeObservers } }] });

  fs.writeFileSync(SIMULATION_FILE, meta + "\r\n" + units.join("\r\n") + SIMULATION_CODE);
  console.log("Snapshot saved!");
}

readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY) process.stdin.setRawMode(true);

console.log("Press 1-9 to control speed of game and 0 to resume normal speed");
console.log("Press Space to pause game");
console.log("Press S to save a simulation snapshot");
console.log("Press Escape to exit");
process.stdin.on("keypress", (chunk, key) => {
  if (key.name === "escape") process.exit(0);
  if (key.ctrl && (key.name == "c" || key.name == "x" || key.name == "C" || key.name == "X")) process.exit(0);
  if (chunk == "s" || chunk == "S") takingSnapshot = true;
  if (chunk == " ") pause();
  if (chunk >= "0" && chunk <= "9") slow(chunk);
});
