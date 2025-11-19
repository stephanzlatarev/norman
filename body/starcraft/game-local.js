import { spawn } from "child_process";
import readline from "readline";
import Game from "./game.js";

let speed = 0;
let paused = false;

export default class LocalGame extends Game {

  constructor(config) {
    super();

    this.config = config;
  }

  async connect() {
    console.log("Connecting to StarCraft II game...");

    for (let i = 0; i < 12; i++) {
      try {
        await this.client.connect({ host: "127.0.0.1", port: 5000 });
        break;
      } catch (_) {
        if (!i && this.config.version && this.config.path) {
          console.log("Starting StarCraft II...");

          spawn("..\\Versions\\" + this.config.version + "\\SC2_x64.exe", [
            "-displaymode", "0", "-windowx", "0", "-windowy", "0", "-windowwidth", "2500", "-windowheight", "1875",
            "-listen", "127.0.0.1", "-port", "5000"
          ], {
            cwd: this.config.path + "\\Support64"
          });
        } else {
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }

    console.log("Creating game...");
    await this.client.createGame(this.config);

    console.log("Joining game...");
    await this.client.joinGame({
      race: this.config.playerSetup[0].race,
      options: { raw: true, score: true },
    });

    console.log("Ready to play.");
  }

  async step() {
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

readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY) process.stdin.setRawMode(true);

console.log("Press 1-9 to control speed of game and 0 to resume normal speed");
console.log("Press Space to pause game");
console.log("Press Escape to exit");
process.stdin.on("keypress", (chunk, key) => {
  if (key.name === "escape") process.exit(0);
  if (key.ctrl && (key.name == "c" || key.name == "x" || key.name == "C" || key.name == "X")) process.exit(0);
  if (chunk == " ") pause();
  if (chunk >= "0" && chunk <= "9") slow(chunk);
});
