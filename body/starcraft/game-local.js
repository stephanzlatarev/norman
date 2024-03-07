import { spawn } from "child_process";
import Game from "./game.js";
import Trace from "./trace.js";

export default class LocalGame extends Game {

  constructor(config) {
    super();

    this.config = config;

    if (this.config.trace) {
      this.trace = new Trace(this.config.trace);
    }
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
  }

  async step() {
    if (this.trace) {
      await this.trace.step(this.client);
    }

    await super.step();
  }

}
