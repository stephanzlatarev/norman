import { spawn } from "child_process";
import Game from "../game.js";

export default class LocalGame extends Game {

  constructor(node) {
    super(node);
  }

  async attach() {
    console.log("Starting StarCraft II game...");

    const config = this.node.get("config");

    spawn("..\\Versions\\" + config.version + "\\SC2.exe", [
      "-displaymode", "0", "-windowx", "0", "-windowy", "0",
      "-windowwidth", "1920", "-windowwidth", "1440", // Alternatively, width: 1920 height: 1080/1200/1440 (1680/1050)
      "-listen", "127.0.0.1", "-port", "5000"
    ], {
      cwd: config.path + "\\Support"
    });

    for (let i = 0; i < 12; i++) {
      try {
        await this.client.connect({ host: "localhost", port: 5000 });
        break;
      } catch (_) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    await this.client.createGame(config);

    await this.client.joinGame({
      race: config.playerSetup[0].race,
      options: { raw: true },
    });
  }

}
