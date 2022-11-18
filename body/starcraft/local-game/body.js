import { spawn } from "child_process";
import Game from "../game.js";

export default class LocalGame extends Game {

  constructor(config) {
    super();
    this.config = config;
  }

  async attach() {
    console.log("Starting StarCraft II game...");

    spawn("..\\Versions\\" + this.config.starcraft.version + "\\SC2.exe", [
      "-displaymode", "0", "-windowx", "0", "-windowy", "0",
      "-windowwidth", "1920", "-windowwidth", "1440", // Alternatively, width: 1920 height: 1080/1200/1440 (1680/1050)
      "-listen", "127.0.0.1", "-port", "5000"
    ], {
      cwd: this.config.starcraft.path + "\\Support"
    });

    for (let i = 0; i < 12; i++) {
      try {
        await this.client.connect({ host: "localhost", port: 5000 });
        break;
      } catch (_) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    await this.client.createGame(this.config.starcraft.game);

    await this.client.joinGame({
      race: this.config.starcraft.game.playerSetup[0].race,
      options: { raw: true },
    });
  }

}
