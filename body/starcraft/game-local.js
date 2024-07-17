import { spawn } from "child_process";
import fs from "fs";
import readline from "readline";
import Game from "./game.js";
import Trace from "./trace.js";
import Units from "./units.js";

const SIMULATION_FILE = "./body/starcraft/simulation.js";
const SIMULATION_CODE = `
import Units from "./units.js";
let loop = 0;

export default async function simulate(client) {
  if (loop === 1) {
    for (const unit of units) {
      if (!has(Units.warriors(), unit) && !has(Units.buildings(), unit) && !has(Units.enemies(), unit)) {
        await spawn(client, unit);
      }
    }
  }

  loop++;
}

function has(collection, unit) {
  for (const one of collection.values()) {
    if (one.isOwn && (unit.owner === 2)) continue;
    if (one.isEnemy && (unit.owner === 1)) continue;
    if (unit.type !== one.type.id) continue;
    if (Math.abs(one.body.x - unit.x) > 0.1) continue;
    if (Math.abs(one.body.y - unit.y) > 0.1) continue;

    return true;
  }
}

async function spawn(client, unit) {
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
`;

let speed = 0;
let paused = false;

export default class LocalGame extends Game {

  constructor(config) {
    super();

    this.config = config;
    this.trace = new Trace();
  }

  async connect() {
    if (fs.existsSync(SIMULATION_FILE)) {
      const module = await import("./simulation.js");
      this.simulation = module.default;
    }

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
  }

  async step() {
    if (this.trace) {
      await this.trace.step(this.client);
    }

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

function unit(unit) {
  return { owner: unit.isOwn ? 1 : 2, type: unit.type.id, x: unit.body.x, y: unit.body.y };
}

function save() {
  const units = [];

  for (const warrior of Units.warriors().values()) {
    units.push(unit(warrior));
  }

  for (const building of Units.buildings().values()) {
    units.push(unit(building));
  }

  for (const enemy of Units.enemies().values()) {
    units.push(unit(enemy));
  }

  fs.writeFileSync(SIMULATION_FILE, "const units = " + JSON.stringify(units, null, 2) + ";" + SIMULATION_CODE);
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
  if (chunk == "s" || chunk == "S") save();
  if (chunk == " ") pause();
  if (chunk >= "0" && chunk <= "9") slow(chunk);
});
